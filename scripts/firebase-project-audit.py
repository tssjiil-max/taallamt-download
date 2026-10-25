"""Read Firebase project metadata through an ephemeral GitHub OIDC identity.

Never reads Firestore documents or writes cloud resources. Successful metadata
checks still require comparison with the existing production app configuration.
"""
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPOSITORY = 'tssjiil-max/taallamt-download'
REF = 'refs/heads/migration/firebase-hosting-staging-20261025'


def validate_context(env):
    if (env.get('GITHUB_REPOSITORY') != REPOSITORY or env.get('GITHUB_REF') != REF
            or env.get('GITHUB_EVENT_NAME') not in ('push', 'workflow_dispatch')):
        raise ValueError('AUDIT_REPOSITORY_REF_OR_EVENT_DENIED')
    project = env.get('TAALLAMT_FIREBASE_PROJECT_ID', '')
    number = env.get('TAALLAMT_FIREBASE_PROJECT_NUMBER', '')
    app = env.get('TAALLAMT_FIREBASE_WEB_APP_ID', '')
    provider = env.get('TAALLAMT_WIF_PROVIDER', '')
    account = env.get('TAALLAMT_AUDIT_SERVICE_ACCOUNT', '')
    if (not re.fullmatch(r'[a-z][a-z0-9-]{4,28}[a-z0-9]', project)
            or any(term in project for term in ('iaqar', 'aqar', 'broker', 'radar'))):
        raise ValueError('UNVERIFIED_OR_UNRELATED_PROJECT_ID')
    if not re.fullmatch(r'[1-9][0-9]{5,20}', number):
        raise ValueError('PROJECT_NUMBER_REQUIRED')
    if not re.fullmatch(r'1:' + re.escape(number) + r':web:[a-zA-Z0-9]+', app):
        raise ValueError('WEB_APP_PROJECT_NUMBER_MISMATCH')
    if not re.fullmatch(r'projects/' + number + r'/locations/global/workloadIdentityPools/[a-z0-9-]+/providers/[a-z0-9-]+', provider):
        raise ValueError('WIF_PROJECT_MISMATCH')
    if account != f'taallamt-audit@{project}.iam.gserviceaccount.com':
        raise ValueError('AUDIT_SERVICE_ACCOUNT_MISMATCH')
    return {'project_id': project, 'project_number': number, 'web_app_id': app}


def read_json(url, token, opener=urllib.request.urlopen):
    # URLs are constructed by collect_metadata, never supplied by API responses.
    request = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'}, method='GET')
    try:
        with opener(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        # Do not expose credential values, response bodies or request headers.
        raise RuntimeError(f'GOOGLE_METADATA_HTTP_{error.code}') from None
    except (urllib.error.URLError, TimeoutError, ValueError):
        raise RuntimeError('GOOGLE_METADATA_REQUEST_FAILED') from None


def list_metadata(url, key, get_json):
    result, page_token, seen = [], '', set()
    for _ in range(100):
        page_url = url + ('?' + urllib.parse.urlencode({'pageToken': page_token}) if page_token else '')
        page = get_json(page_url)
        result.extend(page.get(key, []))
        page_token = page.get('nextPageToken', '')
        if not page_token:
            return result
        if page_token in seen:
            raise ValueError('REPEATED_METADATA_PAGE_TOKEN')
        seen.add(page_token)
    raise ValueError('METADATA_PAGE_LIMIT_EXCEEDED')


def collect_metadata(context, get_json):
    project, number = context['project_id'], context['project_number']
    app = urllib.parse.quote(context['web_app_id'], safe='')
    remote = get_json(f'https://firebase.googleapis.com/v1beta1/projects/{project}')
    if (remote.get('projectId') != project or str(remote.get('projectNumber')) != number
            or remote.get('state') != 'ACTIVE'):
        raise ValueError('REMOTE_FIREBASE_PROJECT_MISMATCH')
    config = get_json(f'https://firebase.googleapis.com/v1beta1/projects/{project}/webApps/{app}/config')
    if config.get('projectId') != project or config.get('appId') != context['web_app_id']:
        raise ValueError('REMOTE_WEB_APP_MISMATCH')
    sites = list_metadata(f'https://firebasehosting.googleapis.com/v1beta1/projects/{project}/sites', 'sites', get_json)
    databases = list_metadata(f'https://firestore.googleapis.com/v1/projects/{project}/databases', 'databases', get_json)
    return {
        'status': 'metadata_verified_pending_owner_comparison',
        'deployment_ready': False,
        'project_id': project,
        'project_number': number,
        'web_app_id': context['web_app_id'],
        'hosting_sites': [{k: site[k] for k in ('name', 'defaultUrl', 'type') if k in site} for site in sites],
        'firestore_databases': [{k: db[k] for k in ('name', 'locationId', 'type', 'deleteProtectionState',
                                'pointInTimeRecoveryEnablement', 'earliestVersionTime') if k in db} for db in databases],
        'not_checked': ['production_configuration_comparison', 'security_rules', 'runtime_iam',
                        'student_data_preservation', 'backup_restore', 'login_e2e', 'rollback'],
    }


def main():
    context = validate_context(os.environ)
    if '--validate-only' in sys.argv:
        print('Repository, ref and owner-supplied project identifiers passed validation; no cloud requests made.')
        return
    token = os.environ.get('GOOGLE_AUDIT_ACCESS_TOKEN', '')
    if not token:
        raise ValueError('EPHEMERAL_ACCESS_TOKEN_REQUIRED')
    report = collect_metadata(context, lambda url: read_json(url, token))
    destination = Path('migration-evidence')
    destination.mkdir(exist_ok=True)
    (destination / 'firebase-project-metadata.json').write_text(json.dumps(report, indent=2) + '\n')
    print('Sanitized Firebase metadata saved; no student documents accessed. Deployment remains blocked.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
