import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { api } from '../api';
import { Confirm } from '../components/Confirm';
import { DateInput, Field, NumberInput, Toggle } from '../components/Field';
import { LocalizedField } from '../components/LocalizedField';
import { OrderableList } from '../components/OrderableList';
import { SaveBar } from '../components/SaveBar';
import { emptyText, type JourneyItem, type LocalizedText } from '../types';
import { fieldErrors, generalError, useEditor, useUnsavedGuard } from '../useEditor';
import { useScreenText } from '../useScreenText';
import './journey.css';

/** Only this screen says these words; the shared ones (Save, Delete, English…) come from strings.ts. */
const labels = {
  en: {
    add: 'Add entry',
    empty: 'No journey entries yet.',
    hidden: 'Hidden',
    oneLanguage: 'One language only',
    untitled: 'Untitled entry',
    present: 'Present',
    deleteQuestion: 'Delete the entry “{name}” for good?',
    reorderFailed: 'The new order could not be saved.',
    newEntry: 'New entry',
    editing: 'Editing',
    close: 'Close editor',
    discard: 'Discard changes',
    discardQuestion: 'Close and lose the unsaved changes?',
    title: 'Title',
    organisation: 'Organisation',
    summary: 'Summary',
    highlights: 'Highlights',
    highlight: 'Highlight',
    addHighlight: 'Add highlight',
    removeHighlight: 'Remove highlight',
    noHighlights: 'No highlights yet.',
    startDate: 'Start date',
    endDate: 'End date',
    endHint: 'Leave this empty while the role is still going on.',
    kind: 'Part of',
    kindMain: 'Main journey',
    kindAdditional: 'Additional experience',
    seniority: 'Seniority',
    seniorityHint: '1 is the most junior, 5 the most senior.',
  },
  ar: {
    add: 'إضافة مدخل',
    empty: 'لا توجد مداخل بعد.',
    hidden: 'مخفي',
    oneLanguage: 'بلغة واحدة فقط',
    untitled: 'مدخل بلا عنوان',
    present: 'حتى الآن',
    deleteQuestion: 'حذف المدخل «{name}» نهائياً؟',
    reorderFailed: 'تعذّر حفظ الترتيب الجديد.',
    newEntry: 'مدخل جديد',
    editing: 'تعديل',
    close: 'إغلاق المحرّر',
    discard: 'تجاهل التغييرات',
    discardQuestion: 'إغلاق وفقدان التغييرات غير المحفوظة؟',
    title: 'العنوان',
    organisation: 'جهة العمل',
    summary: 'نبذة',
    highlights: 'أبرز الإنجازات',
    highlight: 'إنجاز',
    addHighlight: 'إضافة إنجاز',
    removeHighlight: 'حذف الإنجاز',
    noHighlights: 'لا توجد إنجازات بعد.',
    startDate: 'تاريخ البداية',
    endDate: 'تاريخ النهاية',
    endHint: 'اتركه فارغاً إذا كان العمل مستمراً.',
    kind: 'ضمن',
    kindMain: 'المسيرة الرئيسية',
    kindAdditional: 'خبرات إضافية',
    seniority: 'المستوى',
    seniorityHint: '١ هو الأدنى و٥ هو الأعلى.',
  },
};

/** What POST and PUT take: the entry without the two things the server owns. */
interface JourneyEdit {
  title: LocalizedText;
  organisation: LocalizedText;
  summary: LocalizedText;
  highlights: LocalizedText[];
  startDate: string;
  /** Empty on screen means "still going on", and the server only understands that as null. */
  endDate: string | null;
  kind: 'main' | 'additional';
  seniority: number;
  visible: boolean;
}

const payload = (entry: JourneyItem): JourneyEdit => ({
  title: entry.title,
  organisation: entry.organisation,
  summary: entry.summary,
  highlights: entry.highlights,
  startDate: entry.startDate,
  endDate: entry.endDate,
  kind: entry.kind,
  seniority: entry.seniority,
  visible: entry.visible,
});

/** id 0 is the entry that does not exist yet: saving it POSTs instead of PUTs. */
const blank = (): JourneyItem => ({
  id: 0,
  sortOrder: 0,
  title: emptyText(),
  organisation: emptyText(),
  summary: emptyText(),
  highlights: [],
  startDate: new Date().toISOString().slice(0, 10),
  endDate: null,
  kind: 'main',
  seniority: 3,
  visible: true,
});

const written = (text: LocalizedText) => text.en.trim() !== '' || text.ar.trim() !== '';

/** Half-written: one language says something the other does not. */
function halfWritten(entry: JourneyItem): boolean {
  const pairs = [entry.title, entry.organisation, entry.summary, ...entry.highlights];
  return pairs.some(pair => (pair.en.trim() === '') !== (pair.ar.trim() === ''));
}

export function JourneyScreen() {
  const { lang, t, s } = useScreenText(labels);
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<JourneyItem[] | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState<JourneyItem | null>(null);
  const [listMessage, setListMessage] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);

  useEffect(() => {
    let alive = true;
    setItems(null);
    setLoadError(null);
    api<JourneyItem[]>('/api/admin/journey')
      .then(list => {
        if (alive) setItems(list);
      })
      .catch((reason: unknown) => {
        if (alive) setLoadError(reason);
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const openId = Number(params.get('id'));
  // A draft outranks the address: it is the one thing not saved anywhere else yet.
  const selected = draft ?? items?.find(entry => entry.id === openId) ?? null;
  const editor = useEditor<JourneyItem>(selected);
  const value = editor.value;
  const error = fieldErrors(saveError);

  useUnsavedGuard(editor.dirty, t('guard.leave'));

  const show = (text: LocalizedText) => (lang === 'ar' ? text.ar || text.en : text.en || text.ar);
  /** Its title in the interface language, or the other one rather than nothing at all. */
  const nameOf = (entry: JourneyItem) => show(entry.title) || s('untitled');

  const failure = (reason: unknown, fallback: string) =>
    fieldErrors(reason)('ids') ?? generalError(reason, fallback) ?? fallback;

  const forget = () => {
    setSaved(false);
    setSaveError(null);
    setListMessage(undefined);
  };

  const openEntry = (id: number) => {
    forget();
    setDraft(null);
    setParams({ id: String(id) });
  };

  const startNew = () => {
    forget();
    setParams({});
    setDraft(blank());
  };

  const closeEditor = () => {
    forget();
    setDraft(null);
    setParams({});
  };

  const reorder = (ids: number[]) => {
    const previous = items ?? [];
    const byId = new Map(previous.map(entry => [entry.id, entry]));
    setItems(ids.map(id => byId.get(id)).filter((entry): entry is JourneyItem => entry !== undefined));
    setListMessage(undefined);
    // Shown in the new order at once, and put back exactly as it was if the server disagrees.
    void api<void>('/api/admin/journey/order', { method: 'PUT', body: ids }).catch((reason: unknown) => {
      setItems(previous);
      setListMessage(failure(reason, s('reorderFailed')));
    });
  };

  const remove = (entry: JourneyItem) => {
    setListMessage(undefined);
    void api<void>(`/api/admin/journey/${entry.id}`, { method: 'DELETE' })
      .then(() => {
        setItems(list => (list ?? []).filter(other => other.id !== entry.id));
        if (openId === entry.id) closeEditor();
      })
      .catch((reason: unknown) => setListMessage(failure(reason, t('error.generic'))));
  };

  const save = () => {
    if (!value) return;
    const creating = value.id === 0;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    const request = creating
      ? api<JourneyItem>('/api/admin/journey', { method: 'POST', body: payload(value) })
      : api<JourneyItem>(`/api/admin/journey/${value.id}`, { method: 'PUT', body: payload(value) });

    void request
      .then(stored => {
        setItems(list =>
          creating ? [...(list ?? []), stored] : (list ?? []).map(entry => (entry.id === stored.id ? stored : entry)),
        );
        setDraft(null);
        setParams({ id: String(stored.id) });
        setSaved(true);
      })
      .catch((reason: unknown) => setSaveError(reason))
      .finally(() => setSaving(false));
  };

  const setHighlights = (next: (current: LocalizedText[]) => LocalizedText[]) =>
    editor.set(current => ({ ...current, highlights: next(current.highlights) }));

  return (
    <section className="admin-journey">
      <h1>{t('nav.journey')}</h1>

      <p>
        <button type="button" onClick={startNew}>
          {s('add')}
        </button>
      </p>

      {listMessage ? (
        <p className="admin-error" role="alert">
          {listMessage}
        </p>
      ) : null}

      {loadError ? (
        <p className="admin-error" role="alert">
          {generalError(loadError, t('error.load')) ?? t('error.load')}{' '}
          <button type="button" onClick={() => setAttempt(count => count + 1)}>
            {t('action.retry')}
          </button>
        </p>
      ) : items === null ? (
        <p>{t('state.loading')}</p>
      ) : items.length === 0 ? (
        <p>{s('empty')}</p>
      ) : (
        <OrderableList
          items={items}
          id={entry => entry.id}
          label={nameOf}
          onReorder={reorder}
          renderItem={entry => (
            <div className="admin-journey-row">
              <h3 className="admin-journey-name">
                <button type="button" onClick={() => openEntry(entry.id)}>
                  {nameOf(entry)}
                </button>
              </h3>
              <p className="admin-journey-facts">
                <span>{written(entry.organisation) ? show(entry.organisation) : t('field.none')}</span>
                <span>{`${entry.startDate} – ${entry.endDate ?? s('present')}`}</span>
                <span>{entry.visible ? t('field.visible') : s('hidden')}</span>
                {halfWritten(entry) ? <span className="admin-journey-partial">{s('oneLanguage')}</span> : null}
              </p>
              <Confirm
                question={s('deleteQuestion').replace('{name}', nameOf(entry))}
                triggerLabel={`${t('action.delete')}: ${nameOf(entry)}`}
                onConfirm={() => remove(entry)}
              />
            </div>
          )}
        />
      )}

      {value ? (
        <div className="admin-journey-editor">
          <div className="admin-journey-editor-head">
            <h2>{value.id === 0 ? s('newEntry') : `${s('editing')}: ${nameOf(value)}`}</h2>
            {editor.dirty ? (
              <Confirm
                question={s('discardQuestion')}
                confirmLabel={s('discard')}
                triggerLabel={s('close')}
                onConfirm={closeEditor}
              />
            ) : (
              <button type="button" onClick={closeEditor}>
                {s('close')}
              </button>
            )}
          </div>

          <LocalizedField
            name="title"
            label={s('title')}
            value={value.title}
            maxLength={200}
            error={error}
            onChange={next => editor.set({ title: next })}
          />
          <LocalizedField
            name="organisation"
            label={s('organisation')}
            value={value.organisation}
            maxLength={200}
            error={error}
            onChange={next => editor.set({ organisation: next })}
          />
          <LocalizedField
            name="summary"
            label={s('summary')}
            value={value.summary}
            multiline
            rows={4}
            maxLength={2000}
            error={error}
            onChange={next => editor.set({ summary: next })}
          />

          <fieldset className="admin-journey-highlights">
            <legend>{s('highlights')}</legend>
            {error('highlights') ? (
              <span className="admin-error" role="alert">
                {error('highlights')}
              </span>
            ) : null}
            {value.highlights.length === 0 ? (
              <p className="admin-hint">{s('noHighlights')}</p>
            ) : (
              <OrderableList
                items={value.highlights.map((highlight, index) => ({ index, highlight }))}
                id={row => row.index}
                label={row => `${s('highlight')} ${row.index + 1}`}
                onReorder={order => setHighlights(current => order.map(index => current[index]))}
                renderItem={row => (
                  <div className="admin-journey-highlight">
                    <LocalizedField
                      name={`highlights[${row.index}]`}
                      label={`${s('highlight')} ${row.index + 1}`}
                      value={row.highlight}
                      maxLength={400}
                      error={error}
                      onChange={next =>
                        setHighlights(current => current.map((old, index) => (index === row.index ? next : old)))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setHighlights(current => current.filter((_, index) => index !== row.index))}
                    >
                      {`${s('removeHighlight')} ${row.index + 1}`}
                    </button>
                  </div>
                )}
              />
            )}
            <button type="button" onClick={() => setHighlights(current => [...current, emptyText()])}>
              {s('addHighlight')}
            </button>
          </fieldset>

          <div className="admin-grid">
            <DateInput
              id="journey-start"
              label={s('startDate')}
              value={value.startDate}
              error={error('startDate')}
              onChange={next => editor.set({ startDate: next })}
            />
            <DateInput
              id="journey-end"
              label={s('endDate')}
              hint={s('endHint')}
              value={value.endDate ?? ''}
              error={error('endDate')}
              onChange={next => editor.set({ endDate: next === '' ? null : next })}
            />
          </div>

          <div className="admin-grid">
            <Field id="journey-kind" label={s('kind')} error={error('kind')}>
              <select
                id="journey-kind"
                value={value.kind}
                aria-invalid={error('kind') ? true : undefined}
                aria-describedby={error('kind') ? 'journey-kind-error' : undefined}
                onChange={event => editor.set({ kind: event.target.value === 'additional' ? 'additional' : 'main' })}
              >
                <option value="main">{s('kindMain')}</option>
                <option value="additional">{s('kindAdditional')}</option>
              </select>
            </Field>
            <NumberInput
              id="journey-seniority"
              label={s('seniority')}
              hint={s('seniorityHint')}
              min={1}
              max={5}
              value={value.seniority}
              error={error('seniority')}
              onChange={next => editor.set({ seniority: next })}
            />
          </div>

          <Toggle
            id="journey-visible"
            label={t('field.visible')}
            checked={value.visible}
            onChange={next => editor.set({ visible: next })}
          />

          <SaveBar
            dirty={editor.dirty}
            saving={saving}
            saved={saved}
            error={generalError(saveError, t('error.generic'))}
            onSave={save}
            onReset={editor.reset}
          />
        </div>
      ) : null}
    </section>
  );
}
