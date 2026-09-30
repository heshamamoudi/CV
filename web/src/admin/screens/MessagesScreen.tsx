import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { Confirm } from '../components/Confirm';
import { useScreenText } from '../useScreenText';
import type { AdminLang } from '../strings';
import './messages.css';

type Status = 'new' | 'read' | 'archived';
type Filter = 'all' | Status;
interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  body: string;
  lang: string;
  status: Status;
  receivedAt: string;
}
interface Page { items: Message[]; total: number; unread: number; page: number; pageSize: number }

const labels = {
  en: {
    title: 'Inbox', lead: 'Messages sent through the contact form. Open a message to mark it read; replying opens your mail app.',
    all: 'All', new: 'New', read: 'Read', archived: 'Archived', search: 'Search messages', searchButton: 'Search',
    loading: 'Loading messages…', empty: 'No messages match this view.', loadError: 'Messages could not be loaded.',
    sender: 'Sender', received: 'Received', status: 'Status', message: 'Message', reply: 'Reply by email',
    markNew: 'Mark new', markRead: 'Mark read', archive: 'Archive', delete: 'Delete',
    deleteQuestion: 'Delete message from {name}: “{subject}”? This cannot be undone.',
    previous: 'Previous', next: 'Next', page: 'Page {page} of {pages}', range: '{first}–{last} of {total}',
    mutationError: 'That change could not be saved. Try again.',
  },
  ar: {
    title: 'البريد الوارد', lead: 'الرسائل المرسلة عبر نموذج التواصل. افتح الرسالة لوضع علامة مقروءة؛ يفتح الرد تطبيق البريد لديك.',
    all: 'الكل', new: 'جديدة', read: 'مقروءة', archived: 'مؤرشفة', search: 'ابحث في الرسائل', searchButton: 'بحث',
    loading: 'جارٍ تحميل الرسائل…', empty: 'لا توجد رسائل في هذا العرض.', loadError: 'تعذّر تحميل الرسائل.',
    sender: 'المرسل', received: 'تاريخ الاستلام', status: 'الحالة', message: 'الرسالة', reply: 'الرد عبر البريد',
    markNew: 'وضع كجديدة', markRead: 'وضع كمقروءة', archive: 'أرشفة', delete: 'حذف',
    deleteQuestion: 'حذف رسالة {name}: «{subject}»؟ لا يمكن التراجع عن ذلك.',
    previous: 'السابق', next: 'التالي', page: 'صفحة {page} من {pages}', range: '{first}–{last} من {total}',
    mutationError: 'تعذّر حفظ التغيير. حاول مرة أخرى.',
  },
} satisfies Record<AdminLang, Record<string, string>>;

const filters: Filter[] = ['all', 'new', 'read', 'archived'];

export function MessagesScreen() {
  const { lang, t, s } = useScreenText(labels);
  const [filter, setFilter] = useState<Filter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<Message | null>(null);
  const [mutationError, setMutationError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setLoadFailed(false);
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('status', filter);
    if (query) params.set('q', query);
    params.set('page', String(page));
    api<Page>(`/api/admin/messages?${params.toString()}`)
      .then(data => {
        if (!live) return;
        setResult(data);
        setLoading(false);
        setSelected(current => current ? data.items.find(item => item.id === current.id) ?? null : null);
      })
      .catch(() => {
        if (!live) return;
        setLoadFailed(true);
        setLoading(false);
      });
    return () => { live = false; };
  }, [filter, query, page, retry]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
    setSelected(null);
  }

  async function setStatus(message: Message, status: Status) {
    setBusy(true);
    setMutationError(false);
    try {
      await api<void>(`/api/admin/messages/${encodeURIComponent(message.id)}`, { method: 'PATCH', body: { status } });
      setSelected(current => current?.id === message.id ? { ...current, status } : current);
      setResult(current => current ? {
        ...current,
        unread: current.unread + (message.status === 'new' && status !== 'new' ? -1 : message.status !== 'new' && status === 'new' ? 1 : 0),
        items: current.items.map(item => item.id === message.id ? { ...item, status } : item),
      } : current);
      if (filter !== 'all' && filter !== status) {
        setSelected(null);
        setRetry(n => n + 1);
      }
    } catch {
      setMutationError(true);
    } finally {
      setBusy(false);
    }
  }

  async function remove(message: Message) {
    setBusy(true);
    setMutationError(false);
    try {
      await api<void>(`/api/admin/messages/${encodeURIComponent(message.id)}`, { method: 'DELETE' });
      setSelected(null);
      setRetry(n => n + 1);
    } catch {
      setMutationError(true);
    } finally {
      setBusy(false);
    }
  }

  async function openMessage(message: Message) {
    setSelected(message);
    if (message.status === 'new') await setStatus(message, 'read');
  }

  const messages = result?.items ?? [];
  const pageSize = result?.pageSize ?? 20;
  const pages = Math.max(1, Math.ceil((result?.total ?? 0) / pageSize));
  const first = result?.total ? ((result.page - 1) * pageSize) + 1 : 0;
  const last = result?.total ? first + messages.length - 1 : 0;
  const date = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.valueOf()) ? value : new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : 'en', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
  };
  const label = (status: Status) => s(status);

  return (
    <section className="admin-messages">
      <h1>{s('title')}</h1>
      <p className="admin-hint">{s('lead')}</p>

      <div className="admin-messages-tools">
        <nav className="admin-message-filters" aria-label={s('title')}>
          {filters.map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => { setFilter(value); setPage(1); setSelected(null); }}>
            {s(value)}{value === 'new' && result?.unread ? <span className="admin-message-count">{result.unread}</span> : null}
          </button>)}
        </nav>
        <form className="admin-message-search" onSubmit={submitSearch} role="search">
          <label className="admin-sr-only" htmlFor="admin-message-search">{s('search')}</label>
          <input id="admin-message-search" value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder={s('search')} />
          <button type="submit">{s('searchButton')}</button>
        </form>
      </div>

      {loadFailed ? <div className="admin-message-error" role="alert"><p>{s('loadError')}</p><button type="button" onClick={() => setRetry(n => n + 1)}>{t('action.retry')}</button></div> : null}
      {mutationError ? <p className="admin-error" role="alert">{s('mutationError')}</p> : null}
      {loading ? <p>{s('loading')}</p> : !loadFailed && result && result.total === 0 ? <p className="admin-message-empty">{s('empty')}</p> : null}

      {!loading && !loadFailed && result && result.total > 0 ? <>
        <div className="admin-message-layout">
          <div className="admin-message-list" aria-label={s('title')}>
            {messages.map(message => <button key={message.id} type="button" className={`admin-message-item${selected?.id === message.id ? ' is-selected' : ''}${message.status === 'new' ? ' is-new' : ''}`} aria-current={selected?.id === message.id ? 'true' : undefined} onClick={() => void openMessage(message)}>
              <span className="admin-message-item-top"><strong>{message.name}</strong><time dateTime={message.receivedAt}>{date(message.receivedAt)}</time></span>
              <span className="admin-message-item-subject">{message.subject}</span>
              <span className="admin-message-item-bottom"><span>{message.email}</span><span className={`admin-message-status status-${message.status}`}>{label(message.status)}</span></span>
            </button>)}
          </div>

          <article className="admin-message-detail" aria-label={s('message')}>
            {selected ? <>
              <div className="admin-message-detail-head">
                <div><h2>{selected.subject}</h2><p>{s('sender')}: <strong>{selected.name}</strong> · <a href={`mailto:${encodeURIComponent(selected.email)}?subject=${encodeURIComponent(`Re: ${selected.subject}`)}`}>{selected.email}</a></p><p><time dateTime={selected.receivedAt}>{date(selected.receivedAt)}</time> · {s('status')}: {label(selected.status)}</p></div>
                <a className="admin-message-reply" href={`mailto:${encodeURIComponent(selected.email)}?subject=${encodeURIComponent(`Re: ${selected.subject}`)}`}>{s('reply')}</a>
              </div>
              <div className="admin-message-body" dir={selected.lang === 'ar' ? 'rtl' : 'auto'}>{selected.body}</div>
              <div className="admin-message-actions">
                {selected.status !== 'read' ? <button type="button" disabled={busy} onClick={() => void setStatus(selected, 'read')}>{s('markRead')}</button> : null}
                {selected.status !== 'new' ? <button type="button" disabled={busy} onClick={() => void setStatus(selected, 'new')}>{s('markNew')}</button> : null}
                {selected.status !== 'archived' ? <button type="button" disabled={busy} onClick={() => void setStatus(selected, 'archived')}>{s('archive')}</button> : null}
                <Confirm triggerLabel={s('delete')} confirmLabel={s('delete')} question={s('deleteQuestion').replace('{name}', selected.name).replace('{subject}', selected.subject)} onConfirm={() => void remove(selected)} />
              </div>
            </> : <p className="admin-message-empty">{lang === 'ar' ? 'اختر رسالة لعرضها.' : 'Select a message to read it.'}</p>}
          </article>
        </div>
        <div className="admin-message-pagination">
          <span>{s('range').replace('{first}', String(first)).replace('{last}', String(last)).replace('{total}', String(result.total))}</span>
          <div><button type="button" disabled={page <= 1 || loading} onClick={() => setPage(n => n - 1)}>{s('previous')}</button><span>{s('page').replace('{page}', String(result.page)).replace('{pages}', String(pages))}</span><button type="button" disabled={page >= pages || loading} onClick={() => setPage(n => n + 1)}>{s('next')}</button></div>
        </div>
      </> : null}
    </section>
  );
}
