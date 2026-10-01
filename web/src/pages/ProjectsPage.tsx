import { Link } from "react-router";
import type { HomeData } from "../types";
import { ArchiveFrame } from "../components/ArchiveFrame";

export function ProjectsPage({ home }: { home: HomeData }) {
  const ar = home.lang === "ar";
  return (
    <ArchiveFrame chapter={1} label={ar ? "أرشيف الأعمال" : "THE WORK INDEX"}>
      <div className="library-heading">
        <p className="section-kicker">
          {ar ? "أنظمة ذات غاية" : "SYSTEMS WITH PURPOSE"}
        </p>
        <h1>
          {ar ? (
            <>
              أعمال مختارة.
              <br />
              <em>أثر ملموس.</em>
            </>
          ) : (
            <>
              Selected work.
              <br />
              <em>Real-world impact.</em>
            </>
          )}
        </h1>
        <span className="library-count">
          {String(home.projects.length).padStart(2, "0")}{" "}
          {ar ? "مشاريع" : "PROJECTS"}
        </span>
      </div>
      <div className="project-library" data-scroll-region>
        {home.projects.map((project, i) => (
          <Link
            to={`/${home.lang}/projects/${project.slug}`}
            className="library-row"
            key={project.slug}
          >
            <span className="library-number">
              {String(i + 1).padStart(2, "0")}
            </span>
            {project.cover && <img className="library-cover" src={project.cover.src} srcSet={project.cover.srcSet} sizes="(max-width: 700px) 70px, 120px" width={project.cover.width} height={project.cover.height} alt={project.cover.alt} loading="lazy" />}
            <div>
              {project.featured && <span className="project-featured">{ar ? "مميّز" : "Featured"}</span>}
              <h2>{project.title}</h2>
              <p>{project.summary}</p>
              {project.technologies.length > 0 && <div className="project-tags">{project.technologies.slice(0, 3).map(item => <span key={item}>{item}</span>)}</div>}
            </div>
            <span className="library-arrow" aria-hidden="true">
              ↗
            </span>
          </Link>
        ))}
      </div>
    </ArchiveFrame>
  );
}
