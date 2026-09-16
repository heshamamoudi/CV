import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../api';
import { Confirm } from '../components/Confirm';
import { DateInput, TextInput } from '../components/Field';
import { LocalizedField } from '../components/LocalizedField';
import { OrderableList } from '../components/OrderableList';
import { SaveBar } from '../components/SaveBar';
import { fieldErrors, generalError, useEditor, useUnsavedGuard } from '../useEditor';
import { useScreenText } from '../useScreenText';
import { emptyText, type CertificateItem, type EducationItem, type LanguageItem, type LocalizedText, type TechnologyItem } from '../types';
import type { AdminLang } from '../strings';
import './lists.css';

/** Only this screen says these things; the shared words come from strings.ts. */
const labels = {
  en: {
    intro: 'Four short lists that appear on the site. Each entry is saved on its own.',
    which: 'Which list',
    technologies: 'Technologies',
    certificates: 'Certificates',
    education: 'Education',
    languages: 'Languages',
    newRow: 'New entry',
    untitled: 'Untitled entry',
    deleteRow: 'Delete “{name}” for good?',
    orderFailed: 'The new order could not be saved, so the list is back the way it was.',
    name: 'Name',
    category: 'Category',
    title: 'Title',
    issuer: 'Issued by',
    issuedOn: 'Issued on',
    degree: 'Degree',
    institution: 'Institution',
    level: 'Level',
  },
  ar: {
    intro: 'أربع قوائم قصيرة تظهر في الموقع. كل إدخال يُحفظ وحده.',
    which: 'أي قائمة',
    technologies: 'التقنيات',
    certificates: 'الشهادات',
    education: 'التعليم',
    languages: 'اللغات',
    newRow: 'إدخال جديد',
    untitled: 'إدخال بلا عنوان',
    deleteRow: 'حذف «{name}» نهائياً؟',
    orderFailed: 'تعذّر حفظ الترتيب الجديد، فعادت القائمة كما كانت.',
    name: 'الاسم',
    category: 'التصنيف',
    title: 'العنوان',
    issuer: 'الجهة المانحة',
    issuedOn: 'تاريخ الإصدار',
    degree: 'الدرجة',
    institution: 'المؤسسة',
    level: 'المستوى',
  },
};

export const listKeys = ['technologies', 'certificates', 'education', 'languages'] as const;
export type ListKey = (typeof listKeys)[number];

const isListKey = (value: string | null): value is ListKey => listKeys.some(key => key === value);

interface OrderedRow {
  id: number;
  sortOrder: number;
}

/** What the API accepts for one entry: everything the owner types, and nothing the server decides. */
type FormOf<TRow extends OrderedRow> = Omit<TRow, 'id' | 'sortOrder'>;

interface FieldsProps<TForm> {
  /** Unique on the page, so every box on every row can have its own label. */
  idPrefix: string;
  value: TForm;
  onChange: (value: TForm) => void;
  /** The server's message, looked up by the API's own field name, e.g. "category.ar". */
  error: (field: string) => string | undefined;
}

interface ListDefinition<TRow extends OrderedRow> {
  toForm: (row: TRow) => FormOf<TRow>;
  blank: () => FormOf<TRow>;
  /** What this entry is called, for the confirmation question and the reorder buttons. */
  name: (form: FormOf<TRow>, lang: AdminLang) => string;
  Fields: (props: FieldsProps<FormOf<TRow>>) => ReactElement;
}

/** The interface language if it is written, otherwise the other one - a name beats a blank. */
const pick = (text: LocalizedText, lang: AdminLang): string => text[lang] || text[lang === 'en' ? 'ar' : 'en'];

const today = () => new Date().toISOString().slice(0, 10);

/**
 * LocalizedField uses one name for both its input ids and its error lookups. A
 * row needs ids that are unique on the page but the API's plain field names for
 * errors, so the suffix (.en / .ar) is kept and everything before it replaced.
 */
function localizedErrors(apiField: string, error: (field: string) => string | undefined) {
  return (field: string) => error(apiField + field.slice(field.lastIndexOf('.')));
}

const technologies: ListDefinition<TechnologyItem> = {
  toForm: row => ({ name: row.name, category: row.category }),
  blank: () => ({ name: '', category: emptyText() }),
  name: form => form.name,
  Fields: function TechnologyFields({ idPrefix, value, onChange, error }) {
    const { s } = useScreenText(labels);
    return (
      <>
        <TextInput
          id={`${idPrefix}-name`}
          label={s('name')}
          value={value.name}
          maxLength={60}
          error={error('name')}
          onChange={name => onChange({ ...value, name })}
        />
        <LocalizedField
          name={`${idPrefix}-category`}
          label={s('category')}
          value={value.category}
          maxLength={100}
          error={localizedErrors('category', error)}
          onChange={category => onChange({ ...value, category })}
        />
      </>
    );
  },
};

const certificates: ListDefinition<CertificateItem> = {
  toForm: row => ({ title: row.title, issuer: row.issuer, issuedOn: row.issuedOn }),
  blank: () => ({ title: emptyText(), issuer: '', issuedOn: today() }),
  name: (form, lang) => pick(form.title, lang),
  Fields: function CertificateFields({ idPrefix, value, onChange, error }) {
    const { s } = useScreenText(labels);
    return (
      <>
        <LocalizedField
          name={`${idPrefix}-title`}
          label={s('title')}
          value={value.title}
          maxLength={200}
          error={localizedErrors('title', error)}
          onChange={title => onChange({ ...value, title })}
        />
        <div className="admin-grid">
          <TextInput
            id={`${idPrefix}-issuer`}
            label={s('issuer')}
            value={value.issuer}
            maxLength={100}
            error={error('issuer')}
            onChange={issuer => onChange({ ...value, issuer })}
          />
          <DateInput
            id={`${idPrefix}-issuedOn`}
            label={s('issuedOn')}
            value={value.issuedOn}
            error={error('issuedOn')}
            onChange={issuedOn => onChange({ ...value, issuedOn })}
          />
        </div>
      </>
    );
  },
};

const education: ListDefinition<EducationItem> = {
  toForm: row => ({ degree: row.degree, institution: row.institution }),
  blank: () => ({ degree: emptyText(), institution: emptyText() }),
  name: (form, lang) => pick(form.degree, lang),
  Fields: function EducationFields({ idPrefix, value, onChange, error }) {
    const { s } = useScreenText(labels);
    return (
      <>
        <LocalizedField
          name={`${idPrefix}-degree`}
          label={s('degree')}
          value={value.degree}
          maxLength={200}
          error={localizedErrors('degree', error)}
          onChange={degree => onChange({ ...value, degree })}
        />
        <LocalizedField
          name={`${idPrefix}-institution`}
          label={s('institution')}
          value={value.institution}
          maxLength={200}
          error={localizedErrors('institution', error)}
          onChange={institution => onChange({ ...value, institution })}
        />
      </>
    );
  },
};

const languages: ListDefinition<LanguageItem> = {
  toForm: row => ({ name: row.name, level: row.level }),
  blank: () => ({ name: emptyText(), level: emptyText() }),
  name: (form, lang) => pick(form.name, lang),
  Fields: function LanguageFields({ idPrefix, value, onChange, error }) {
    const { s } = useScreenText(labels);
    return (
      <>
        <LocalizedField
          name={`${idPrefix}-name`}
          label={s('name')}
          value={value.name}
          maxLength={60}
          error={localizedErrors('name', error)}
          onChange={name => onChange({ ...value, name })}
        />
        <LocalizedField
          name={`${idPrefix}-level`}
          label={s('level')}
          value={value.level}
          maxLength={60}
          error={localizedErrors('level', error)}
          onChange={level => onChange({ ...value, level })}
        />
      </>
    );
  },
};

/** The draft's place in the dirty set; saved rows have positive ids. */
const DRAFT = -1;

interface RowProps<TRow extends OrderedRow> {
  listKey: ListKey;
  def: ListDefinition<TRow>;
  row: TRow;
  onSaved: (row: TRow) => void;
  onDeleted: (id: number) => void;
  onDirty: (key: number, dirty: boolean) => void;
}

/**
 * One saved entry, edited where it sits. It carries its own save bar because a
 * refusal belongs beside the entry that caused it, not at the foot of a screen
 * holding thirty other rows.
 */
function ListRow<TRow extends OrderedRow>({ listKey, def, row, onSaved, onDeleted, onDirty }: RowProps<TRow>) {
  const { t, s, lang } = useScreenText(labels);
  const loaded = useMemo(() => def.toForm(row), [def, row]);
  const editor = useEditor<FormOf<TRow>>(loaded);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);

  useEffect(() => {
    onDirty(row.id, editor.dirty);
    return () => onDirty(row.id, false);
  }, [onDirty, row.id, editor.dirty]);

  const value = editor.value;
  if (value === null) return null;

  const named = def.name(value, lang) || s('untitled');

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setFailure(null);
    try {
      const next = await api<TRow>(`/api/admin/${listKey}/${row.id}`, { method: 'PUT', body: value });
      editor.replace(def.toForm(next));
      onSaved(next);
      setSaved(true);
    } catch (error) {
      setFailure(error);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setFailure(null);
    try {
      await api<void>(`/api/admin/${listKey}/${row.id}`, { method: 'DELETE' });
      onDeleted(row.id);
    } catch (error) {
      setFailure(error);
    }
  };

  return (
    <div className="admin-list-row">
      <def.Fields
        idPrefix={`${listKey}-${row.id}`}
        value={value}
        onChange={next => editor.set(() => next)}
        error={fieldErrors(failure)}
      />
      <div className="admin-list-actions">
        <SaveBar
          dirty={editor.dirty}
          saving={saving}
          saved={saved}
          error={generalError(failure, t('error.generic'))}
          onSave={save}
          onReset={editor.reset}
        />
        <Confirm question={s('deleteRow').replace('{name}', () => named)} triggerLabel={t('action.delete')} onConfirm={remove} />
      </div>
    </div>
  );
}

interface DraftProps<TRow extends OrderedRow> {
  listKey: ListKey;
  def: ListDefinition<TRow>;
  onCreated: (row: TRow) => void;
  onCancel: () => void;
  onDirty: (key: number, dirty: boolean) => void;
}

/** The entry being added. It stays outside the ordered list until the server gives it an id. */
function ListDraft<TRow extends OrderedRow>({ listKey, def, onCreated, onCancel, onDirty }: DraftProps<TRow>) {
  const { t, s } = useScreenText(labels);
  const blank = useMemo(() => def.blank(), [def]);
  const editor = useEditor<FormOf<TRow>>(blank);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);

  useEffect(() => {
    onDirty(DRAFT, editor.dirty);
    return () => onDirty(DRAFT, false);
  }, [onDirty, editor.dirty]);

  const value = editor.value;
  if (value === null) return null;

  const create = async () => {
    setSaving(true);
    setFailure(null);
    try {
      const next = await api<TRow>(`/api/admin/${listKey}`, { method: 'POST', body: value });
      onCreated(next);
    } catch (error) {
      setFailure(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-list-new" aria-label={s('newRow')}>
      <h2>{s('newRow')}</h2>
      <def.Fields idPrefix={`${listKey}-new`} value={value} onChange={next => editor.set(() => next)} error={fieldErrors(failure)} />
      <div className="admin-list-actions">
        <SaveBar
          dirty={editor.dirty}
          saving={saving}
          saved={false}
          error={generalError(failure, t('error.generic'))}
          onSave={create}
          onReset={editor.reset}
        />
        <button type="button" onClick={onCancel}>
          {t('action.cancel')}
        </button>
      </div>
    </section>
  );
}

/** One tab: load it, order it, add to it. Every list is this screen with different boxes. */
function ListTab<TRow extends OrderedRow>({ listKey, def }: { listKey: ListKey; def: ListDefinition<TRow> }) {
  const { t, s, lang } = useScreenText(labels);
  const [rows, setRows] = useState<TRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [orderFailed, setOrderFailed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [dirtyRows, setDirtyRows] = useState<ReadonlySet<number>>(() => new Set<number>());

  useUnsavedGuard(dirtyRows.size > 0, t('guard.leave'));

  useEffect(() => {
    let live = true;
    setRows(null);
    setFailed(false);
    api<TRow[]>(`/api/admin/${listKey}`)
      .then(loaded => {
        if (live) setRows(loaded);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [listKey, attempt]);

  const onDirty = useCallback((key: number, dirty: boolean) => {
    setDirtyRows(current => {
      if (current.has(key) === dirty) return current;
      const next = new Set(current);
      if (dirty) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const onSaved = useCallback((saved: TRow) => {
    setRows(current => current?.map(row => (row.id === saved.id ? saved : row)) ?? current);
  }, []);

  const onDeleted = useCallback((id: number) => {
    setRows(current => current?.filter(row => row.id !== id) ?? current);
  }, []);

  const onCreated = useCallback((created: TRow) => {
    setRows(current => (current ? [...current, created] : [created]));
    setAdding(false);
  }, []);

  /** The whole order, every id: a partial list would leave the positions ambiguous. */
  const reorder = async (ids: number[]) => {
    if (rows === null) return;
    const before = rows;
    const byId = new Map(rows.map(row => [row.id, row]));
    const moved = ids.map(id => byId.get(id)).filter((row): row is TRow => row !== undefined);
    setRows(moved);
    setOrderFailed(false);
    try {
      await api<void>(`/api/admin/${listKey}/order`, { method: 'PUT', body: ids });
    } catch {
      setRows(before);
      setOrderFailed(true);
    }
  };

  if (failed) {
    return (
      <p className="admin-error" role="alert">
        {t('error.load')}{' '}
        <button type="button" onClick={() => setAttempt(n => n + 1)}>
          {t('action.retry')}
        </button>
      </p>
    );
  }

  if (rows === null) return <p>{t('state.loading')}</p>;

  return (
    <>
      {orderFailed ? (
        <p className="admin-error" role="alert">
          {s('orderFailed')}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p>{t('state.empty')}</p>
      ) : (
        <OrderableList
          items={rows}
          id={row => row.id}
          label={row => def.name(def.toForm(row), lang) || s('untitled')}
          onReorder={reorder}
          renderItem={row => (
            <ListRow listKey={listKey} def={def} row={row} onSaved={onSaved} onDeleted={onDeleted} onDirty={onDirty} />
          )}
        />
      )}

      {adding ? (
        <ListDraft listKey={listKey} def={def} onCreated={onCreated} onCancel={() => setAdding(false)} onDirty={onDirty} />
      ) : (
        <p>
          <button type="button" onClick={() => setAdding(true)}>
            {t('action.add')}
          </button>
        </p>
      )}
    </>
  );
}

/**
 * Four lists, one screen. The tab is in the address (?list=certificates) so the
 * dashboard - or a note to self - can link straight to the one that needs work.
 */
export function ListsScreen() {
  const { t, s } = useScreenText(labels);
  const [params] = useSearchParams();
  const asked = params.get('list');
  const tab: ListKey = isListKey(asked) ? asked : 'technologies';

  return (
    <section>
      <h1>{t('nav.lists')}</h1>
      <p>{s('intro')}</p>

      <nav className="admin-list-tabs" aria-label={s('which')}>
        {listKeys.map(key => (
          <Link key={key} to={`/admin/lists?list=${key}`} aria-current={key === tab ? 'page' : undefined}>
            {s(key)}
          </Link>
        ))}
      </nav>

      {tab === 'technologies' ? <ListTab listKey="technologies" def={technologies} /> : null}
      {tab === 'certificates' ? <ListTab listKey="certificates" def={certificates} /> : null}
      {tab === 'education' ? <ListTab listKey="education" def={education} /> : null}
      {tab === 'languages' ? <ListTab listKey="languages" def={languages} /> : null}
    </section>
  );
}
