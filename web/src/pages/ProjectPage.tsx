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
        <h1>
          {project.title}
          <span>.</span>
        </h1>
        <p className="project-summary">{project.summary}</p>
        {project.body && (
          <div className="project-body">
            <h2>{ar ? "نظرة أقرب" : "A closer look"}</h2>
            <p>{project.body}</p>
          </div>
        )}
        {project.technologies.length > 0 && (
          <div className="project-technologies">
            {project.technologies.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        )}
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
