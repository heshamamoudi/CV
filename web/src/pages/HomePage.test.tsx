import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { HomePage } from "./HomePage";
import type { HomeData } from "../types";

vi.mock("../components/Sculpture", () => ({ Sculpture: ({ selectedJourneyIndex }: { selectedJourneyIndex: number }) => <div data-testid="sculpture" data-role-index={selectedJourneyIndex} /> }));

const home: HomeData = {
  lang: "ar",
  profile: {
    name: "هشام العمودي",
    headline: "قائد تطوير التطبيقات",
    eyebrow: "e",
    heroTitle: "h",
    heroSubtitle: "s",
    summary: "ملخص",
    location: "الرياض",
    about: "نبذة",
    quote: "q",
    email: "a@b.c",
    linkedInUrl: "https://l",
    gitHubUrl: "https://g",
  },
  journey: [
    {
      id: 1,
      title: "قائد تطوير التطبيقات",
      organisation: "شركة التنفيذي",
      summary: "",
      highlights: ["قيادة"],
      start: "2025-07",
      end: null,
      kind: "main",
      seniority: 5,
    },
  ],
  featuredProject: null,
  projects: [],
  technologies: [{ category: "قواعد البيانات", items: ["PostgreSQL"] }],
  certificates: [
    { title: "مطور JavaScript متكامل", issuer: "Udacity", issuedOn: "2022-09" },
  ],
  education: [
    {
      degree: "بكالوريوس تقنية المعلومات",
      institution: "جامعة الملك عبدالعزيز",
    },
  ],
  languages: [{ name: "العربية", level: "اللغة الأم" }],
  updatedAt: "2026-09-15T00:00:00Z",
};

describe("HomePage", () => {
  it('renders the profile fields edited in admin and exposes only an available CV', () => {
    const { rerender } = render(<MemoryRouter initialEntries={['/ar']}><HomePage home={home} /></MemoryRouter>);
    expect(screen.getByText(home.profile.eyebrow)).toBeInTheDocument();
    expect(screen.getByText(home.profile.heroTitle)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '05 لنتحدث' }));
    expect(screen.queryByRole('link', { name: /تحميل السيرة/ })).not.toBeInTheDocument();
    rerender(<MemoryRouter initialEntries={['/ar']}><HomePage home={{ ...home, hasCv: true }} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /تحميل السيرة/ })).toHaveAttribute('href', '/ar/cv');
  });

  it("navigates between chapters while keeping profile, journey and technology content reachable", () => {
    render(
      <MemoryRouter initialEntries={["/ar"]}>
        <HomePage home={home} />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("هشام");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "العمودي",
    );
    fireEvent.click(screen.getByRole("button", { name: "03 المسيرة" }));
    expect(
      screen.getByRole("heading", { name: "قائد تطوير التطبيقات" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/حتى الآن/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "04 نبذة" }));
    fireEvent.click(screen.getByRole("button", { name: "التقنيات" }));
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
  });

  it("keeps the certificates, education and languages the server rendered", () => {
    render(
      <MemoryRouter initialEntries={["/ar#about"]}>
        <HomePage home={home} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "الخلفية" }));

    expect(
      screen.getByText("مطور JavaScript متكامل — Udacity"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("بكالوريوس تقنية المعلومات — جامعة الملك عبدالعزيز"),
    ).toBeInTheDocument();
    expect(screen.getByText("العربية — اللغة الأم")).toBeInTheDocument();
  });

  it("does not render a link the server blanked", () => {
    render(
      <MemoryRouter initialEntries={["/ar#contact"]}>
        <HomePage
          home={{ ...home, profile: { ...home.profile, linkedInUrl: "" } }}
        />
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole("link", { name: /LinkedIn/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /GitHub/ })).toBeInTheDocument();
  });

  it("supports keyboard chapter navigation and pauses motion", () => {
    render(
      <MemoryRouter initialEntries={["/ar"]}>
        <HomePage home={home} />
      </MemoryRouter>,
    );
    fireEvent.keyDown(window, { key: "End" });
    expect(screen.getByRole("link", { name: /a@b.c/ })).toHaveAttribute(
      "href",
      "mailto:a@b.c",
    );
    fireEvent.click(screen.getByRole("button", { name: /إيقاف الحركة/ }));
    expect(
      screen.getByRole("button", { name: /تشغيل الحركة/ }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(window, { key: "Home" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("هشام");
  });

  it('previews a career role on hover and focus, then restores the pinned role', async () => {
    const second = { ...home.journey[0], id: 2, title: 'Second role', organisation: 'Second company', start: '2023-04', highlights: ['Second highlight'] };
    render(<MemoryRouter initialEntries={['/ar#journey']}><HomePage home={{ ...home, journey: [home.journey[0], second] }} /></MemoryRouter>);
    const role = screen.getByRole('button', { name: /2023 Second role Second company/ });
    expect(screen.getByRole('heading', { name: home.journey[0].title })).toBeInTheDocument();
    fireEvent.mouseEnter(role);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Second role' })).toBeInTheDocument());
    fireEvent.mouseLeave(role);
    await waitFor(() => expect(screen.getByRole('heading', { name: home.journey[0].title })).toBeInTheDocument());
    fireEvent.focus(role);
    expect(screen.getByRole('heading', { name: 'Second role' })).toBeInTheDocument();
    fireEvent.blur(role);
    fireEvent.click(role);
    expect(role).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Second role' })).toBeInTheDocument();
  });

  it("keeps the selected journey role aligned with the sculpture after leaving and returning", () => {
    const journey = [
      { ...home.journey[0], id: 1, title: "First role", organisation: "First company" },
      { ...home.journey[0], id: 2, title: "Second role", organisation: "Second company", start: "2023-04" },
      { ...home.journey[0], id: 3, title: "Third role", organisation: "Third company", start: "2022-04" },
    ];
    const { container } = render(<MemoryRouter initialEntries={["/ar#journey"]}><HomePage home={{ ...home, journey }} /></MemoryRouter>);
    const chapters = container.querySelectorAll(".chapter-progress button");
    expect(container.querySelector(".journey-roles")).toHaveAttribute("data-scroll-region");
    expect(container.querySelector(".journey-detail")).toHaveAttribute("data-scroll-region");
    fireEvent.click(screen.getByRole("button", { name: /2022 Third role Third company/ }));
    expect(screen.getByRole("heading", { name: "Third role" })).toBeInTheDocument();
    expect(screen.getByTestId("sculpture")).toHaveAttribute("data-role-index", "2");

    fireEvent.click(chapters[3]);
    fireEvent.click(chapters[2]);
    expect(screen.getByRole("heading", { name: "Third role" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /2022 Third role Third company/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("sculpture")).toHaveAttribute("data-role-index", "2");
  });

  it("cancels a pending hover preview when a different role is pinned", async () => {
    const journey = [
      { ...home.journey[0], id: 1, title: "First role", organisation: "First company" },
      { ...home.journey[0], id: 2, title: "Second role", organisation: "Second company", start: "2023-04" },
    ];
    vi.useFakeTimers();
    try {
      render(<MemoryRouter initialEntries={["/ar#journey"]}><HomePage home={{ ...home, journey }} /></MemoryRouter>);
      const first = screen.getByRole("button", { name: /2025 First role First company/ });
      const second = screen.getByRole("button", { name: /2023 Second role Second company/ });
      fireEvent.mouseEnter(second);
      fireEvent.click(first);
      await act(async () => { vi.advanceTimersByTime(100); });

      expect(screen.getByRole("heading", { name: "First role" })).toBeInTheDocument();
      expect(first).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("sculpture")).toHaveAttribute("data-role-index", "0");
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancels a pending preview when the journey list shrinks", async () => {
    const journey = [
      { ...home.journey[0], id: 1, title: "First role", organisation: "First company" },
      { ...home.journey[0], id: 2, title: "Second role", organisation: "Second company", start: "2023-04" },
      { ...home.journey[0], id: 3, title: "Third role", organisation: "Third company", start: "2022-04" },
    ];
    vi.useFakeTimers();
    try {
      const { rerender } = render(<MemoryRouter initialEntries={["/ar#journey"]}><HomePage home={{ ...home, journey }} /></MemoryRouter>);
      fireEvent.mouseEnter(screen.getByRole("button", { name: /2022 Third role Third company/ }));
      rerender(<MemoryRouter initialEntries={["/ar#journey"]}><HomePage home={{ ...home, journey: journey.slice(0, 2) }} /></MemoryRouter>);
      await act(async () => { vi.advanceTimersByTime(100); });

      expect(screen.queryByRole("button", { name: /Third role/ })).not.toBeInTheDocument();
      expect(screen.getByTestId("sculpture")).toHaveAttribute("data-role-index", "0");
      expect(screen.getByRole("heading", { name: "First role" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
