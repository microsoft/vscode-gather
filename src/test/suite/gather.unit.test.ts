// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
"use strict";

import * as assert from "assert";
import { ICell as IVscCell } from "../../types";
import { GatherProvider } from "../../gather";

suite("code gathering unit tests", () => {
  const codeCells: IVscCell[] = [
    {
      id: "72ce5eda-e03a-454b-bfdf-7d53c4bfa91f",
      file: "2DB9B899-6519-4E1B-88B0-FA728A274115",
      line: 0,
      state: 2,
      data: {
        source: `from bokeh.plotting import show, figure, output_notebook\noutput_notebook()`,
        cell_type: "code",
        outputs: [],
        metadata: {},
        execution_count: 1,
      },
    },
    {
      id: "7243c0aa-cf06-4b2f-b557-2d1dcedda943",
      file: "2DB9B899-6519-4E1B-88B0-FA728A274115",
      line: 0,
      state: 2,
      data: {
        source: `x = [1,2,3,4,5]\ny = [21,9,15,17,4]\nprint('This is some irrelevant code')`,
        cell_type: "code",
        outputs: [],
        metadata: {},
        execution_count: 2,
      },
    },
    {
      id: "c510bfd2-5ab5-4879-b877-8d993983c822",
      file: "2DB9B899-6519-4E1B-88B0-FA728A274115",
      line: 0,
      state: 2,
      data: {
        source: `p=figure(title='demo',x_axis_label='x',y_axis_label='y')`,
        cell_type: "code",
        outputs: [],
        metadata: {},
        execution_count: 3,
      },
    },
    {
      id: "4e227548-1337-4894-991a-8f9a92523897",
      file: "2DB9B899-6519-4E1B-88B0-FA728A274115",
      line: 0,
      state: 2,
      data: {
        source: "p.line(x,y,line_width=2)",
        cell_type: "code",
        outputs: [],
        metadata: {},
        execution_count: 4,
      },
    },
    {
      id: "5912d201-dca5-4e5b-ab8a-7ce383e86bbb",
      file: "2DB9B899-6519-4E1B-88B0-FA728A274115",
      line: 0,
      state: 2,
      data: {
        source: "show(p)",
        cell_type: "code",
        outputs: [],
        metadata: {},
        execution_count: 5,
      },
    },
  ];
  const gatherProvider = new GatherProvider("");

  if (gatherProvider && codeCells) {
    test("Logs a cell execution", async () => {
      let count = 0;
      for (const c of codeCells) {
        await postExecute(c, gatherProvider);
        count += 1;
        const logLength = await gatherProvider.getLogLength();
        assert.equal(logLength, count);
      }

      gatherProvider.resetLog();
    });

    test("Gathers program slices for a cell", async () => {
      for (const c of codeCells) {
        await postExecute(c, gatherProvider);
      }

      const cell: IVscCell = codeCells[codeCells.length - 1];
      const program = gatherProvider.gatherCode(cell);
      const expectedProgram =
        "# %%\nfrom bokeh.plotting import show, figure, output_notebook\n# %%\np=figure(title='demo',x_axis_label='x',y_axis_label='y')\n# %%\nshow(p)";
      assert.equal(program.trim(), expectedProgram.trim());

      gatherProvider.resetLog();
    });
  }
});

function postExecute(cell: IVscCell, gatherProvider: GatherProvider) {
  if (cell.data.source !== "") {
    gatherProvider.logExecution(cell);
  }
}
