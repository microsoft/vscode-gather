// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
"use strict";

const fs = require("fs-extra");
const path = require("path");

function updateSpecFiles() {
  console.log(`Updating spec files...`);
  var sourceDir = path.join("resources", "specs");
  var destDir = path.join(
    "node_modules",
    "@msrvida",
    "python-program-analysis",
    "dist",
    "es5",
    "specs"
  );
  fs.copySync(sourceDir, destDir);
}

updateSpecFiles();
