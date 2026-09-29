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
            <div>
              <h2>{project.title}</h2>
              <p>{project.summary}</p>
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
