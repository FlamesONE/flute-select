import { el } from '../utils/dom';

export class FormBridge {
  private inputs: HTMLInputElement[] = [];
  private readonly container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  sync(name: string, selected: Set<string>, isMultiple: boolean): void {
    this.clearInputs();

    if (!name) {
      return;
    }

    const inputName = isMultiple ? `${name}[]` : name;
    const values = Array.from(selected);

    if (values.length === 0) {
      this.addInput(inputName, '');
      return;
    }

    for (const v of values) {
      this.addInput(inputName, v);
    }
  }

  syncNativeSelect(nativeEl: HTMLElement, selected: Set<string>): void {
    if (nativeEl.tagName !== 'SELECT') {
      return;
    }

    const select = nativeEl as HTMLSelectElement;
    for (const opt of Array.from(select.options)) {
      opt.selected = selected.has(opt.value);
    }
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  destroy(): void {
    this.clearInputs();
  }

  private addInput(name: string, value: string): void {
    const input = el('input', { type: 'hidden', name, value });
    this.container.appendChild(input);
    this.inputs.push(input);
  }

  private clearInputs(): void {
    for (const input of this.inputs) {
      input.remove();
    }
    this.inputs = [];
  }
}
