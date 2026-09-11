import type { ComprehensiveAssessment } from '../core/domain';
import { saveComprehensiveAssessment, type SaveAssessmentDeps } from './save-comprehensive-assessment';

export async function saveAssessmentBatch(items:(ComprehensiveAssessment|null)[],deps:SaveAssessmentDeps){
 const actual=items.filter((x):x is ComprehensiveAssessment=>x!==null);
 const results=[];
 for(const assessment of actual){results.push(await saveComprehensiveAssessment(assessment,deps));}
 return {saved:actual.length,effects:results};
}
