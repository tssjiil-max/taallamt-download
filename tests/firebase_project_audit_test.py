"""Metadata-only migration gate: no SDK, live credentials or student data."""
import importlib.util
import pathlib
import unittest

PATH = pathlib.Path(__file__).resolve().parents[1] / 'scripts/firebase-project-audit.py'


class AuditTests(unittest.TestCase):
    def setUp(self):
        self.assertTrue(PATH.exists(), 'keyless Firebase identity auditor is not implemented')
        spec = importlib.util.spec_from_file_location('firebase_audit', PATH)
        self.audit = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.audit)
        self.env = {
            'GITHUB_REPOSITORY': 'tssjiil-max/taallamt-download',
            'GITHUB_REF': 'refs/heads/migration/firebase-hosting-staging-20261025',
            'GITHUB_EVENT_NAME': 'push',
            'TAALLAMT_FIREBASE_PROJECT_ID': 'education-test-123',
            'TAALLAMT_FIREBASE_PROJECT_NUMBER': '123456789',
            'TAALLAMT_FIREBASE_WEB_APP_ID': '1:123456789:web:abcdef',
            'TAALLAMT_WIF_PROVIDER': 'projects/123456789/locations/global/workloadIdentityPools/taallamt-audit/providers/github',
            'TAALLAMT_AUDIT_SERVICE_ACCOUNT': 'taallamt-audit@education-test-123.iam.gserviceaccount.com',
        }

    def test_identity_refuses_wrong_repository_ref_and_pr(self):
        for key, value in [('GITHUB_REPOSITORY', 'other/repo'), ('GITHUB_REF', 'refs/heads/main'),
                           ('GITHUB_EVENT_NAME', 'pull_request'), ('TAALLAMT_FIREBASE_PROJECT_ID', 'aqar-b5d76'),
                           ('TAALLAMT_FIREBASE_PROJECT_ID', 'iaqar-ai-staging'),
                           ('TAALLAMT_FIREBASE_PROJECT_ID', ''),
                           ('TAALLAMT_FIREBASE_WEB_APP_ID', '1:999:web:abcdef'),
                           ('TAALLAMT_WIF_PROVIDER', 'projects/999/locations/global/workloadIdentityPools/p/providers/g'),
                           ('TAALLAMT_AUDIT_SERVICE_ACCOUNT', 'audit@other-project.iam.gserviceaccount.com')]:
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                self.audit.validate_context({**self.env, key: value})

    def test_valid_owner_supplied_identity_is_accepted(self):
        self.assertEqual(self.audit.validate_context(self.env)['project_id'], 'education-test-123')

    def collect(self, mutate=None):
        calls = []
        responses = [
            {'projectId': 'education-test-123', 'projectNumber': '123456789', 'displayName': 'Test', 'state': 'ACTIVE'},
            {'projectId': 'education-test-123', 'appId': '1:123456789:web:abcdef', 'apiKey': 'DO_NOT_EXPORT'},
            {'sites': [{'name': 'projects/123456789/sites/test-site', 'defaultUrl': 'https://test-site.web.app'}], 'nextPageToken': 'next'},
            {'sites': [{'name': 'projects/123456789/sites/test-site-2'}]},
            {'databases': [{'name': 'projects/education-test-123/databases/(default)', 'locationId': 'europe-west1', 'type': 'FIRESTORE_NATIVE', 'pointInTimeRecoveryEnablement': 'POINT_IN_TIME_RECOVERY_ENABLED', 'secret': 'DO_NOT_EXPORT'}]},
        ]
        if mutate:
            mutate(responses)

        def get_json(url):
            calls.append(url)
            self.assertNotIn('/documents', url)
            self.assertNotIn(':runQuery', url)
            return responses.pop(0)

        result = self.audit.collect_metadata(self.audit.validate_context(self.env), get_json)
        return result, calls

    def test_reads_metadata_with_pagination_and_exports_no_keys(self):
        result, calls = self.collect()
        self.assertEqual(len(calls), 5)
        self.assertIn('pageToken=next', calls[3])
        self.assertEqual(len(result['hosting_sites']), 2)
        self.assertEqual(result['firestore_databases'][0]['locationId'], 'europe-west1')
        self.assertNotIn('DO_NOT_EXPORT', str(result))
        self.assertEqual(result['status'], 'metadata_verified_pending_owner_comparison')
        self.assertFalse(result['deployment_ready'])

    def test_remote_project_and_web_app_mismatch_fail_closed(self):
        for index, key, value in [(0, 'projectId', 'other-project'), (0, 'projectNumber', '999'),
                                  (0, 'state', 'DELETED'), (1, 'appId', '1:999:web:wrong'),
                                  (1, 'projectId', 'other-project')]:
            with self.subTest(index=index, key=key), self.assertRaises(ValueError):
                self.collect(lambda responses: responses[index].update({key: value}))

    def test_failed_api_response_does_not_echo_token_or_response_body(self):
        import io
        import urllib.error
        error = urllib.error.HTTPError('https://firebase.googleapis.com/x', 403, 'bad', {}, io.BytesIO(b'PRIVATE_DATA'))
        def fail(*args, **kwargs):
            raise error
        with self.assertRaises(RuntimeError) as caught:
            self.audit.read_json('https://firebase.googleapis.com/x', 'PRIVATE_TOKEN', opener=fail)
        self.assertNotIn('PRIVATE', str(caught.exception))
        self.assertIn('403', str(caught.exception))


if __name__ == '__main__':
    unittest.main()
