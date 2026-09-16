import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router';
import { ApiError, api } from '../api';
import { Toggle, TextInput } from '../components/Field';
import { LocalizedField } from '../components/LocalizedField';
import { MediaPicker } from '../components/MediaPicker';
import { OrderableList } from '../components/OrderableList';
import { SaveBar } from '../components/SaveBar';
import { Confirm } from '../components/Confirm';
import { fieldErrors, generalError, useEditor, useUnsavedGuard } from '../useEditor';
import { useScreenText } from '../useScreenText';
import { emptyText, type LocalizedText, type ProjectItem } from '../types';
import './projects.css';

/** The server's own limits, said in the browser so a refusal never costs a round trip. */
const MAX_TECHNOLOGIES = 30;
const MAX_TECHNOLOGY_LENGTH = 40;

const labels = {
  en: {
    heading: 'Projects',
    add: 'New project',
    empty: 'No projects yet. The first one is the one the site leads with.',
    editing: 'Editing',
    creating: 'New project',
    slug: 'Address',
    slugHint: 'The last part of the project’s web address. Changing it keeps the old address working: an old link is redirected here.',
    title: 'Title',
    summary: 'Summary',
    body: 'Body',
    technologies: 'Technologies',
    techAdd: 'Add a technology',
    techHint: 'Type a name and press Enter. Up to 30, each at most 40 characters.',
    techRemove: 'Remove {name}',
    techTooMany: 'That is one too many: at most 30 technologies. Remove one first.',
    techTooLong: 'A technology name can be at most 40 characters.',
    techDuplicate: '“{name}” is already listed.',
    featured: 'Featured',
    featuredOnly: 'Only one project can be featured.',
    featuredMoves: 'Only one project can be featured. Saving this takes the mark from “{name}”.',
    cover: 'Cover image',
    hidden: 'Hidden',
    deleteQuestion: 'Delete the project “{name}”?',
    discardQuestion: 'Leave “{name}” without saving your changes?',
    discard: 'Discard changes',
    reorderFailed: 'The new order could not be saved, so the old order is back.',
    untitled: 'Untitled project',
  },
  ar: {
    heading: 'المشاريع',
    add: 'مشروع جديد',
    empty: 'لا توجد مشاريع بعد. الأول هو ما يتصدّر الموقع.',
    editing: 'تعديل',
    creating: 'مشروع جديد',
    slug: 'العنوان المختصر',
    slugHint: 'الجزء الأخير من عنوان المشروع على الويب. تغييره يُبقي العنوان القديم يعمل: الرابط القديم يُحوَّل إلى هنا.',
    title: 'العنوان',
    summary: 'نبذة',
    body: 'النص',
    technologies: 'التقنيات',
    techAdd: 'إضافة تقنية',
    techHint: 'اكتب الاسم ثم اضغط Enter. حتى ٣٠ تقنية، كل اسم ٤٠ حرفاً على الأكثر.',
    techRemove: 'إزالة {name}',
    techTooMany: 'هذه واحدة زائدة: ٣٠ تقنية على الأكثر. أزل واحدة أولاً.',
    techTooLong: 'اسم التقنية ٤٠ حرفاً على الأكثر.',
    techDuplicate: '«{name}» مضافة بالفعل.',
    featured: 'مميّز',
    featuredOnly: 'مشروع واحد فقط يمكن أن يكون مميّزاً.',
    featuredMoves: 'مشروع واحد فقط يمكن أن يكون مميّزاً. الحفظ ينقل العلامة من «{name}».',
    cover: 'صورة الغلاف',
    hidden: 'مخفي',
    deleteQuestion: 'حذف المشروع «{name}»؟',
    discardQuestion: 'مغادرة «{name}» دون حفظ التغييرات؟',
    discard: 'تجاهل التغييرات',
    reorderFailed: 'تعذّر حفظ الترتيب الجديد، فعاد الترتيب السابق.',
    untitled: 'مشروع بلا عنوان',
  },
};

const fill = (template: string, name: string) => template.replace('{name}', name);

const blank = (): ProjectItem => ({
  id: 0,
  sortOrder: 0,
  slug: '',
  title: emptyText(),
  summary: emptyText(),
  body: emptyText(),
  technologies: [],
  featured: false,
  visible: true,
  coverMediaId: null,
});

/** Exactly the shape ProjectEdit binds to - id and sortOrder are the server's business. */
const payload = (project: ProjectItem) => ({
  slug: project.slug,
  title: project.title,
  summary: project.summary,
  body: project.body,
  technologies: project.technologies,
  featured: project.featured,
  visible: project.visible,
  coverMediaId: project.coverMediaId,
});

export function ProjectsScreen() {
  const { lang, t, s } = useScreenText(labels);
  const [params] = useSearchParams();
  const requested = params.get('id');

  const [items, setItems] = useState<ProjectItem[] | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ProjectItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setItems(await api<ProjectItem[]>('/api/admin/projects'));
    } catch (failure) {
      setLoadError(failure);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // A link from the dashboard ("the Arabic summary is missing") opens that project.
  useEffect(() => {
    if (!items || requested === null) return;
    const id = Number(requested);
    if (items.some(project => project.id === id)) setSelectedId(id);
  }, [items, requested]);

  const selected = useMemo(
    () => draft ?? items?.find(project => project.id === selectedId) ?? null,
    [draft, items, selectedId],
  );
  const editor = useEditor<ProjectItem>(selected);
  const value = editor.value;

  useUnsavedGuard(editor.dirty, t('guard.leave'));

  const name = useCallback(
    (project: ProjectItem) =>
      project.title[lang] || project.title[lang === 'en' ? 'ar' : 'en'] || project.slug || s('untitled'),
    [lang, s],
  );

  const close = () => {
    setDraft(null);
    setSelectedId(null);
    setSaveError(null);
    setSaved(false);
  };

  const open = (project: ProjectItem) => {
    setDraft(null);
    setSelectedId(project.id);
    setSaveError(null);
    setSaved(false);
  };

  const create = () => {
    setSelectedId(null);
    setSaveError(null);
    setSaved(false);
    setDraft(blank());
  };

  const reorder = async (ids: number[]) => {
    const previous = items ?? [];
    const byId = new Map(previous.map(project => [project.id, project]));
    setReorderError(null);
    setItems(ids.map(id => byId.get(id)).filter((project): project is ProjectItem => project !== undefined));
    try {
      await api<void>('/api/admin/projects/order', { method: 'PUT', body: ids });
    } catch (failure) {
      // The list the owner is looking at must be the list the server has.
      setItems(previous);
      const why = failure instanceof ApiError ? failure.field('ids') ?? failure.message : t('error.generic');
      setReorderError(`${s('reorderFailed')} ${why}`);
    }
  };

  const save = async () => {
    if (!value) return;
    const creating = draft !== null;
    setSaving(true);
    setSaveError(null);
    try {
      const stored = await api<ProjectItem>(creating ? '/api/admin/projects' : `/api/admin/projects/${value.id}`, {
        method: creating ? 'POST' : 'PUT',
        body: payload(value),
      });
      // The server takes the featured mark off whoever held it; the list says the same.
      setItems(current => {
        const others = (current ?? []).map(project =>
          stored.featured && project.id !== stored.id ? { ...project, featured: false } : project,
        );
        return others.some(project => project.id === stored.id)
          ? others.map(project => (project.id === stored.id ? stored : project))
          : [...others, stored];
      });
      setDraft(null);
      setSelectedId(stored.id);
      editor.replace(stored);
      setSaved(true);
    } catch (failure) {
      setSaveError(failure);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (project: ProjectItem) => {
    setSaveError(null);
    try {
      await api<void>(`/api/admin/projects/${project.id}`, { method: 'DELETE' });
      setItems(current => (current ?? []).filter(other => other.id !== project.id));
      close();
    } catch (failure) {
      setSaveError(failure);
    }
  };

  if (loadError) {
    return (
      <section>
        <h1>{s('heading')}</h1>
        <p className="admin-error" role="alert">
          {t('error.load')}
        </p>
        <button type="button" onClick={() => void load()}>
          {t('action.retry')}
        </button>
      </section>
    );
  }

  if (!items) {
    return (
      <section>
        <h1>{s('heading')}</h1>
        <p>{t('state.loading')}</p>
      </section>
    );
  }

  const error = fieldErrors(saveError);
  const featuredElsewhere = value?.featured ? items.find(other => other.featured && other.id !== value.id) : undefined;

  return (
    <section>
      <h1>{s('heading')}</h1>

      <p>
        <button type="button" onClick={create}>
          {s('add')}
        </button>
      </p>

      {reorderError ? (
        <p className="admin-error" role="alert">
          {reorderError}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p>{s('empty')}</p>
      ) : (
        <OrderableList
          items={items}
          id={project => project.id}
          label={name}
          onReorder={ids => void reorder(ids)}
          renderItem={project => (
            <div className="projects-row">
              <span className="projects-name">{name(project)}</span>
              <code className="projects-slug">{project.slug}</code>
              {project.featured ? <span className="projects-badge">{s('featured')}</span> : null}
              {project.visible ? null : <span className="projects-badge">{s('hidden')}</span>}
              <button type="button" aria-label={`${t('action.edit')}: ${name(project)}`} onClick={() => open(project)}>
                {t('action.edit')}
              </button>
            </div>
          )}
        />
      )}

      {value ? (
        <article className="projects-editor">
          <h2>{draft ? s('creating') : `${s('editing')}: ${name(value)}`}</h2>

          <TextInput
            id="project-slug"
            label={s('slug')}
            value={value.slug}
            hint={s('slugHint')}
            error={error('slug')}
            dir="ltr"
            onChange={slug => editor.set({ slug })}
          />

          <LocalizedField
            name="title"
            label={s('title')}
            value={value.title}
            error={error}
            onChange={(title: LocalizedText) => editor.set({ title })}
          />
          <LocalizedField
            name="summary"
            label={s('summary')}
            value={value.summary}
            error={error}
            multiline
            rows={3}
            onChange={(summary: LocalizedText) => editor.set({ summary })}
          />
          <LocalizedField
            name="body"
            label={s('body')}
            value={value.body}
            error={error}
            multiline
            rows={8}
            onChange={(body: LocalizedText) => editor.set({ body })}
          />

          <Technologies
            value={value.technologies}
            error={error('technologies')}
            onChange={technologies => editor.set({ technologies })}
          />

          <Toggle
            id="project-featured"
            label={s('featured')}
            checked={value.featured}
            // Said while the mark is being claimed, which is the moment it matters.
            hint={
              value.featured
                ? featuredElsewhere
                  ? fill(s('featuredMoves'), name(featuredElsewhere))
                  : s('featuredOnly')
                : undefined
            }
            onChange={featured => editor.set({ featured })}
          />
          <Toggle
            id="project-visible"
            label={t('field.visible')}
            checked={value.visible}
            onChange={visible => editor.set({ visible })}
          />

          <MediaPicker label={s('cover')} value={value.coverMediaId} onChange={coverMediaId => editor.set({ coverMediaId })} />
          {error('coverMediaId') ? (
            <p className="admin-error" role="alert">
              {error('coverMediaId')}
            </p>
          ) : null}

          <div className="projects-actions">
            {draft ? null : (
              <Confirm
                question={fill(s('deleteQuestion'), name(value))}
                triggerLabel={t('action.delete')}
                onConfirm={() => void remove(value)}
              />
            )}
            {editor.dirty ? (
              <Confirm
                question={fill(s('discardQuestion'), name(value))}
                confirmLabel={s('discard')}
                triggerLabel={t('action.close')}
                onConfirm={close}
              />
            ) : (
              <button type="button" onClick={close}>
                {t('action.close')}
              </button>
            )}
          </div>

          <SaveBar
            dirty={editor.dirty}
            saving={saving}
            saved={saved}
            error={generalError(saveError, t('error.generic'))}
            onSave={() => void save()}
            onReset={editor.reset}
          />
        </article>
      ) : null}
    </section>
  );
}

interface TechnologiesProps {
  value: string[];
  error?: string;
  onChange: (value: string[]) => void;
}

/** Names as chips: adding one is a whole action, so Enter confirms it and it becomes a thing that can be taken back off. */
function Technologies({ value, error, onChange }: TechnologiesProps) {
  const { t, s } = useScreenText(labels);
  const [typed, setTyped] = useState('');
  const [refused, setRefused] = useState<string | null>(null);

  // Nothing is trimmed away in silence: a name that cannot be added stays in the box with the reason beside it.
  const add = () => {
    const name = typed.trim();
    if (!name) return;
    if (name.length > MAX_TECHNOLOGY_LENGTH) return setRefused(s('techTooLong'));
    if (value.some(existing => existing.toLowerCase() === name.toLowerCase())) return setRefused(fill(s('techDuplicate'), name));
    if (value.length >= MAX_TECHNOLOGIES) return setRefused(s('techTooMany'));
    setRefused(null);
    setTyped('');
    onChange([...value, name]);
  };

  const key = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    add();
  };

  const message = refused ?? error;

  return (
    <fieldset className="projects-tech">
      <legend>{s('technologies')}</legend>
      {value.length === 0 ? (
        <p className="admin-hint">{t('field.none')}</p>
      ) : (
        <ul className="projects-chips">
          {value.map(name => (
            <li key={name}>
              <span>{name}</span>
              <button
                type="button"
                aria-label={fill(s('techRemove'), name)}
                onClick={() => {
                  setRefused(null);
                  onChange(value.filter(other => other !== name));
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="admin-field">
        <label htmlFor="project-tech">{s('techAdd')}</label>
        <input
          id="project-tech"
          value={typed}
          dir="ltr"
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? 'project-tech-hint project-tech-error' : 'project-tech-hint'}
          onChange={event => {
            setTyped(event.target.value);
            setRefused(null);
          }}
          onKeyDown={key}
        />
        <span className="admin-hint" id="project-tech-hint">
          {s('techHint')}
        </span>
        {message ? (
          <span className="admin-error" id="project-tech-error" role="alert">
            {message}
          </span>
        ) : null}
      </p>
      <p>
        <button type="button" onClick={add} disabled={typed.trim() === ''}>
          {t('action.add')}
        </button>
      </p>
    </fieldset>
  );
}
