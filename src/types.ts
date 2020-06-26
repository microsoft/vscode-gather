import type { nbformat } from "@jupyterlab/coreutils";

export namespace Constants {
  export const DefaultCodeCellMarker = "# %%";
}

export interface IGatherProvider {
  logExecution(vscCell: ICell): void;
  gatherCode(vscCell: ICell): string;
  resetLog(): void;
}

export interface ICell {
  id: string; // This value isn't unique. File and line are needed too.
  file: string;
  line: number;
  state: CellState;
  data:
    | nbformat.ICodeCell
    | nbformat.IRawCell
    | nbformat.IMarkdownCell
    | IMessageCell;
  extraLines?: number[];
}

export enum CellState {
  editing = -1,
  init = 0,
  executing = 1,
  finished = 2,
  error = 3,
}

export interface IMessageCell extends nbformat.IBaseCell {
  cell_type: "messages";
  messages: string[];
}
