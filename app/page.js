import Dashboard from '../components/Dashboard';
import candidates from '../data/candidates.json';
import report from '../data/processing-report.json';

export default function Page() {
  return <Dashboard initialCandidates={candidates} report={report} />;
}
