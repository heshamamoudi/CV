import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LocalizedField } from './LocalizedField';
import { SaveBar } from './SaveBar';
import { Confirm } from './Confirm';
import { OrderableList } from './OrderableList';
import { TextInput } from './Field';

describe('bilingual fields', () => {
  it('shows both languages and reports the edited pair', () => {
    const onChange = vi.fn();
    render(<LocalizedField name="headline" label="Headline" value={{ en: 'Lead', ar: 'قائد' }} onChange={onChange} />);

    const arabic = screen.getByLabelText('Arabic');
    expect(screen.getByLabelText('English')).toHaveValue('Lead');
    expect(arabic).toHaveValue('قائد');
    expect(arabic).toHaveAttribute('dir', 'rtl');

    fireEvent.change(arabic, { target: { value: 'قائد تطوير' } });
    expect(onChange).toHaveBeenCalledWith({ en: 'Lead', ar: 'قائد تطوير' });
  });

  it("puts the server's message on the field it belongs to", () => {
    render(
      <LocalizedField
        name="headline"
        label="Headline"
        value={{ en: '', ar: '' }}
        onChange={() => {}}
        error={field => (field === 'headline.ar' ? 'at most 200 characters' : undefined)}
      />,
    );

    const arabic = screen.getByLabelText('Arabic');
    expect(arabic).toHaveAttribute('aria-invalid', 'true');
    expect(arabic).toHaveAccessibleDescription('at most 200 characters');
    expect(screen.getByLabelText('English')).not.toHaveAttribute('aria-invalid');
  });

  it('describes a plain field by its hint as well as its error', () => {
    render(<TextInput id="slug" label="Address" value="sms" onChange={() => {}} hint="Changing this keeps the old link working" error="already used" />);

    expect(screen.getByLabelText('Address')).toHaveAccessibleDescription(/old link working already used/);
  });
});

describe('the save bar', () => {
  it('only offers to save real changes, and shows what went wrong', () => {
    const { rerender } = render(<SaveBar dirty={false} saving={false} saved={false} onSave={() => {}} onReset={() => {}} />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    rerender(<SaveBar dirty saving={false} saved={false} error="Request failed (502)" onSave={() => {}} onReset={() => {}} />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Request failed (502)');

    rerender(<SaveBar dirty={false} saving saved={false} onSave={() => {}} onReset={() => {}} />);
    expect(screen.getByText('Saving…')).toBeInTheDocument();
  });
});

describe('confirmation', () => {
  it('asks before doing anything, and names what would go', () => {
    const onConfirm = vi.fn();
    render(<Confirm question="Delete the project “Safety Management System”?" triggerLabel="Delete" onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('Delete the project “Safety Management System”?')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('can be called off', () => {
    const onConfirm = vi.fn();
    render(<Confirm question="Delete this?" triggerLabel="Delete" onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });
});

describe('reordering', () => {
  const items = [
    { id: 7, name: 'First' },
    { id: 8, name: 'Second' },
    { id: 9, name: 'Third' },
  ];

  function list(onReorder: (ids: number[]) => void) {
    return render(
      <OrderableList items={items} id={i => i.id} label={i => i.name} onReorder={onReorder} renderItem={i => <span>{i.name}</span>} />,
    );
  }

  it('sends the whole new order when an item moves', () => {
    const onReorder = vi.fn();
    list(onReorder);

    fireEvent.click(screen.getByRole('button', { name: 'Move down: First' }));

    expect(onReorder).toHaveBeenCalledWith([8, 7, 9]);
  });

  it('does not offer to move the ends off the list', () => {
    list(vi.fn());

    expect(screen.getByRole('button', { name: 'Move up: First' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move down: Third' })).toBeDisabled();
  });
});
