import { AlertTriangle, Code2 } from "lucide-react";
import type { Repository } from "../domain/scan";
import { StatusBadge, formatScanStatus } from "./Badges";

export function RepositoryCoverage({ repositories }: { repositories: Repository[] }) {
  return (
    <section id="repositories-section" className="repositories-section" aria-labelledby="repositories-title">
      <div className="section-heading compact-heading"><div><div className="section-kicker">COBERTURA</div><h2 id="repositories-title">Repositorios analizados <span className="heading-count">{repositories.length}</span></h2></div></div>
      {repositories.length ? <div className="repo-grid">{repositories.map((repository) => <RepositoryCard repository={repository} key={repository.fullName} />)}</div> : <p className="chart-empty">El archivo no incluye detalles por repositorio.</p>}
    </section>
  );
}

function RepositoryCard({ repository }: { repository: Repository }) {
  return (
    <article className="repo-card">
      <div className="repo-card-top"><div className="repo-icon"><Code2 size={16} /></div><StatusBadge status={repository.status} /></div>
      <h3>{repository.name}</h3>
      <p className="repo-fullname">{repository.fullName}</p>
      <div className="repo-languages">{repository.languages.length ? repository.languages.slice(0, 3).map((language) => <span key={language}>{language}</span>) : <span>Lenguaje no detectado</span>}</div>
      {repository.error && <p className="repo-error"><AlertTriangle size={13} />{repository.error}</p>}
      <div className="repo-card-bottom">{repository.checks.length ? repository.checks.map((check) => <span key={check.id}>{check.label}<strong>{check.status ? formatScanStatus(check.status) : "—"}{check.itemCount === null ? "" : ` · ${check.itemCount}`}</strong></span>) : <span>Comprobaciones<strong>No disponibles</strong></span>}</div>
    </article>
  );
}
