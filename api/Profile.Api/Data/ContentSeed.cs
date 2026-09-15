using Microsoft.EntityFrameworkCore;

namespace Profile.Api.Data;

/// <summary>
/// The owner's CV (Hesham_Amoudi_2026-_CV.pdf) as starting content. Arabic is a
/// draft for the owner to review in admin before launch. Runs only on an empty
/// database, so edits made in admin are never overwritten.
/// </summary>
public static class ContentSeed
{
    public static async Task EnsureAsync(ProfileContext db, CancellationToken ct = default)
    {
        if (await db.Profiles.AnyAsync(ct)) return;

        db.Profiles.Add(new ProfileRecord
        {
            Name = T("Hesham Amoudi", "هشام العمودي"),
            Headline = T("Lead Application Development", "قائد تطوير التطبيقات"),
            Eyebrow = T("Enterprise applications & digital transformation", "تطبيقات المؤسسات والتحول الرقمي"),
            HeroTitle = T("Technology that builds a safer, simpler future.", "تقنية تبني مستقبلاً أكثر أماناً وبساطة."),
            HeroSubtitle = T(
                "I design and build secure, scalable and compliant digital solutions that make complex operations simpler.",
                "أصمّم وأبني حلولاً رقمية آمنة وقابلة للتوسع ومتوافقة مع المعايير، تجعل العمليات المعقدة أبسط."),
            Summary = T(
                "Lead Application Development professional with 7+ years of experience in ERP systems, digital transformation and enterprise application development. Expert in .NET, Angular, Odoo, API integration and DevOps practices, with a proven ability to lead cross-functional teams, automate business processes and deliver scalable, high-performance systems aligned with business goals.",
                "قائد في تطوير التطبيقات بخبرة تزيد عن سبع سنوات في أنظمة تخطيط موارد المؤسسات والتحول الرقمي وتطوير تطبيقات المؤسسات. متخصص في ‎.NET وAngular وOdoo وتكامل الواجهات البرمجية وممارسات DevOps، مع قدرة مثبتة على قيادة فرق متعددة التخصصات وأتمتة إجراءات الأعمال وتقديم أنظمة عالية الأداء وقابلة للتوسع تتماشى مع أهداف المنشأة."),
            Location = T("Riyadh, Saudi Arabia", "الرياض، المملكة العربية السعودية"),
            About = T(
                "I'm a technology professional with a strong background in enterprise systems, integration and digital transformation. I enjoy solving complex problems, building efficient solutions and contributing to meaningful digital transformation.",
                "مختص تقني بخلفية قوية في أنظمة المؤسسات والتكامل والتحول الرقمي. أستمتع بحل المشكلات المعقدة وبناء حلول فعّالة والمساهمة في تحول رقمي ذي أثر."),
            Quote = T("Better systems. A more connected tomorrow.", "أنظمة أفضل، وغدٌ أكثر ترابطاً."),
            Email = "heshamamoudi.it@gmail.com",
            LinkedInUrl = "https://www.linkedin.com/in/heshamamoudi",
            GitHubUrl = "https://github.com/heshamamoudi",
        });

        var order = 0;
        JourneyEntry Role(string titleEn, string titleAr, string orgEn, string orgAr, DateOnly start, DateOnly? end,
            int seniority, JourneyKind kind, params (string En, string Ar)[] highlights) => new()
        {
            Title = T(titleEn, titleAr),
            Organisation = T(orgEn, orgAr),
            StartDate = start,
            EndDate = end,
            Seniority = seniority,
            Kind = kind,
            SortOrder = order++,
            Highlights = highlights.Select((h, i) => new Highlight { En = h.En, Ar = h.Ar, SortOrder = i }).ToList(),
        };

        db.JourneyEntries.AddRange(
            Role("Lead Application Development", "قائد تطوير التطبيقات", "ALTANFEETHI Company", "شركة التنفيذي",
                new(2025, 7, 1), null, 5, JourneyKind.Main,
                ("Direct and mentor development teams, fostering continuous improvement and professional growth", "قيادة فرق التطوير وتوجيهها بما يعزز التحسين المستمر والنمو المهني"),
                ("Establish coding standards, architectural patterns and development methodologies", "وضع معايير البرمجة والأنماط المعمارية ومنهجيات التطوير"),
                ("Architect scalable workflows and dynamic configurations for core enterprise features, reducing manual effort by 30%+", "تصميم مسارات عمل قابلة للتوسع وإعدادات ديناميكية للخصائص الأساسية، خفّضت الجهد اليدوي بأكثر من 30٪"),
                ("Review BRDs and translate business needs into technical specifications", "مراجعة وثائق متطلبات الأعمال وتحويل الاحتياجات إلى مواصفات تقنية")),
            Role("Business Application Senior Specialist", "أخصائي أول تطبيقات الأعمال", "Jeddah Airports Company", "شركة مطارات جدة",
                new(2024, 9, 1), new(2025, 7, 1), 4, JourneyKind.Main,
                ("Automated 90+ business processes across King Abdulaziz International Airport operations", "أتمتة أكثر من 90 إجراءً تشغيلياً في مطار الملك عبدالعزيز الدولي"),
                ("Led development of the King Abdulaziz International Airport external website", "قيادة تطوير الموقع الإلكتروني الخارجي لمطار الملك عبدالعزيز الدولي"),
                ("Implemented a Safety Management System improving operational compliance", "تطبيق نظام إدارة السلامة بما رفع مستوى الامتثال التشغيلي")),
            Role("Senior Application Engineer", "مهندس تطبيقات أول", "Jeddah Airports Company", "شركة مطارات جدة",
                new(2023, 12, 1), new(2024, 9, 1), 3, JourneyKind.Main,
                ("Designed and optimised software solutions to enhance operational efficiency", "تصميم الحلول البرمجية وتحسينها لرفع الكفاءة التشغيلية"),
                ("Integrated technologies improving functionality for airport departments", "تكامل التقنيات بما حسّن أداء إدارات المطار")),
            Role("Web Developer", "مطور ويب", "Jeddah Airports Company", "شركة مطارات جدة",
                new(2022, 11, 1), new(2023, 12, 1), 3, JourneyKind.Main,
                ("Led the Digital Transformation team enhancing internal airport departments", "قيادة فريق التحول الرقمي لتطوير الإدارات الداخلية في المطار"),
                ("Implemented DevOps solutions and best practices for web development", "تطبيق حلول DevOps وأفضل الممارسات في تطوير الويب")),
            Role("Software Developer", "مطور برمجيات", "Alhalees Medical Center", "مركز الحليس الطبي",
                new(2022, 7, 1), new(2022, 11, 1), 2, JourneyKind.Main,
                ("Developed ERP systems ensuring seamless integration of business processes", "تطوير أنظمة تخطيط موارد المؤسسات بتكامل سلس لإجراءات الأعمال")),
            Role("Odoo Technical Backend Consultant", "استشاري تقني لأنظمة Odoo", "Alhalees Medical Center", "مركز الحليس الطبي",
                new(2021, 3, 1), new(2022, 8, 1), 1, JourneyKind.Main,
                ("Administered the Odoo ERP system and initiated e-commerce platforms", "إدارة نظام Odoo وإطلاق منصات التجارة الإلكترونية"),
                ("Managed the Office 365 environment and provided technical support", "إدارة بيئة Office 365 وتقديم الدعم التقني")),
            Role("Software Development Department Manager", "مدير إدارة تطوير البرمجيات", "Rakeen — Hajj season 2024", "ركين — موسم حج 1445هـ",
                new(2024, 4, 1), new(2024, 7, 1), 4, JourneyKind.Additional,
                ("Led development of the Workforce, Live Feed Pilgrims, Evaluation and Violations modules", "قيادة تطوير وحدات القوى العاملة والبث المباشر للحجاج والتقييم والمخالفات"),
                ("Ensured on-time delivery of mission-critical systems", "ضمان تسليم الأنظمة الحرجة في موعدها")),
            Role("Software Development Team Lead", "قائد فريق تطوير البرمجيات", "Mashariq — Hajj season 2023", "مشارق — موسم حج 1444هـ",
                new(2023, 6, 1), new(2023, 7, 1), 3, JourneyKind.Additional,
                ("Led the development team for the Centers Performance Excellence programme", "قيادة فريق التطوير لبرنامج التميز في أداء المراكز"),
                ("Launched the system and ran training workshops", "إطلاق النظام وتنفيذ ورش تدريبية")));

        var p = 0;
        Project Proj(string slug, string titleEn, string titleAr, string summaryEn, string summaryAr) => new()
        {
            Slug = slug, Title = T(titleEn, titleAr), Summary = T(summaryEn, summaryAr), Body = T("", ""), SortOrder = p++,
        };

        db.Projects.AddRange(
            Proj("kaia-external-website", "King Abdulaziz International Airport website", "الموقع الإلكتروني لمطار الملك عبدالعزيز الدولي",
                "Led development of the airport's public-facing website.", "قيادة تطوير الموقع الإلكتروني الموجّه للجمهور للمطار."),
            Proj("airport-process-automation", "Airport process automation", "أتمتة إجراءات المطار",
                "More than 90 business processes automated across airport operations.", "أتمتة أكثر من 90 إجراءً عبر عمليات المطار."),
            Proj("safety-management-system", "Safety Management System", "نظام إدارة السلامة",
                "A system that improved operational safety compliance.", "نظام رفع مستوى الامتثال لمتطلبات السلامة التشغيلية."),
            Proj("hajj-1445-operations-modules", "Hajj 1445 operations modules", "وحدات تشغيل حج 1445هـ",
                "Workforce, live pilgrim feed, evaluation and violations modules delivered for the Hajj season.", "وحدات القوى العاملة والبث المباشر للحجاج والتقييم والمخالفات لموسم الحج."),
            Proj("hajj-1444-centers-performance", "Centers Performance Excellence", "التميز في أداء المراكز",
                "A performance excellence system for Hajj service centres, launched with training workshops.", "نظام للتميز في أداء مراكز خدمة الحجاج أُطلق مع ورش تدريبية."));

        var t = 0;
        void Tech(string categoryEn, string categoryAr, params string[] names)
        {
            foreach (var n in names)
                db.Technologies.Add(new Technology { Name = n, Category = T(categoryEn, categoryAr), SortOrder = t++ });
        }
        Tech("Languages", "لغات البرمجة", "C#", "TypeScript", "Python", "Dart");
        Tech("Front end", "الواجهات الأمامية", "Angular", "React", "Flutter");
        Tech("Back end & APIs", "الخوادم والواجهات البرمجية", ".NET Web API", ".NET MVC", "Node.js");
        Tech("Databases", "قواعد البيانات", "PostgreSQL", "SQL");
        Tech("ERP", "أنظمة تخطيط الموارد", "Odoo");
        Tech("Cloud & DevOps", "السحابة وDevOps", "Azure", "AWS", "CI/CD", "Docker");

        db.Certificates.AddRange(
            new Certificate { Title = T("Odoo Back-end Technical Consultant", "استشاري تقني للواجهة الخلفية في Odoo"), Issuer = "Odoo", IssuedOn = new(2022, 1, 1), SortOrder = 0 },
            new Certificate { Title = T("Full Stack JavaScript Developer", "مطور JavaScript متكامل"), Issuer = "Udacity", IssuedOn = new(2022, 9, 1), SortOrder = 1 },
            new Certificate { Title = T("Build an app with ASP.NET Core and Angular from scratch", "بناء تطبيق باستخدام ASP.NET Core وAngular من الصفر"), Issuer = "Udemy", IssuedOn = new(2023, 7, 1), SortOrder = 2 });

        db.Education.Add(new Education
        {
            Degree = T("Bachelor in Information Technology", "بكالوريوس تقنية المعلومات"),
            Institution = T("King Abdulaziz University", "جامعة الملك عبدالعزيز"),
        });

        db.SpokenLanguages.AddRange(
            new SpokenLanguage { Name = T("Arabic", "العربية"), Level = T("Native", "اللغة الأم"), SortOrder = 0 },
            new SpokenLanguage { Name = T("English", "الإنجليزية"), Level = T("Proficient", "متقدم"), SortOrder = 1 });

        await db.SaveChangesAsync(ct);
    }

    private static LocalizedText T(string en, string ar) => LocalizedText.Of(en, ar);
}
