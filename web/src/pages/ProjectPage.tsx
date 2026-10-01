import { Link, useParams } from "react-router";
import type { ProjectDto } from "../types";
import { ArchiveFrame } from "../components/ArchiveFrame";

export function ProjectPage({ project }: { project: ProjectDto }) {
  const { lang = "en" } = useParams();
  const ar = lang === "ar";
  return (
    <ArchiveFrame chapter={1} label={ar ? "عن المشروع" : "PROJECT SPOTLIGHT"}>
      <article className="project-story" data-scroll-region>
        <Link className="project-back" to={`/${lang}/projects`}>
          ← {ar ? "جميع المشاريع" : "All projects"}
        </Link>
        <p className="section-kicker">
          {ar ? "من الفكرة إلى التنفيذ" : "FROM IDEA TO IMPLEMENTATION"}
        </p>
        {project.featured && <span className="project-featured">{ar ? "مميّز" : "Featured"}</span>}
        <h1>
          {project.title}
          <span>.</span>
        </h1>
        <p className="project-summary">{project.summary}</p>
        {project.cover && <img className="project-story-cover" src={project.cover.src} srcSet={project.cover.srcSet} sizes="(max-width: 700px) 90vw, 65vw" width={project.cover.width} height={project.cover.height} alt={project.cover.alt} />}
        {project.body && (
          <div className="project-body">
            <h2>{ar ? "نظرة أقرب" : "A closer look"}</h2>
            {project.body.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => {
              const label = paragraph.match(/^([^:\n]{1,30}):\s*/);
              return <p key={index}>{label ? <><strong>{label[1]}:</strong> {paragraph.slice(label[0].length)}</> : paragraph}</p>;
            })}
          </div>
        )}
        {project.technologies.length > 0 && (
          <div className="project-technologies">
            {project.technologies.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        )}
        {(project.repositoryUrl || project.liveUrl) && <div className="project-external-links">
          {project.repositoryUrl && <a href={project.repositoryUrl} target="_blank" rel="noopener noreferrer">{ar ? "المستودع البرمجي" : "Source repository"} ↗</a>}
          {project.liveUrl && <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">{project.slug === 'selfhost-platform' ? (ar ? "افتح لوحة التحكم" : "Open control panel") : (ar ? "زيارة الموقع" : "Visit live site")} ↗</a>}
        </div>}
        <Link className="round-link" to={`/${lang}#contact`}>
          <span>
            {ar ? "لنتحدث عن فكرتك" : "Let’s talk about your next idea"}
          </span>
          <i>↗</i>
        </Link>
      </article>
    </ArchiveFrame>
  );
}
