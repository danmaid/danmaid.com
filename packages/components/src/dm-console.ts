import { DmDataView } from './dm-data-view'

export class DmConsole<T extends Record<string, unknown> = Record<string, unknown>> extends DmDataView<T> {}

customElements.define('dm-console', DmConsole)
