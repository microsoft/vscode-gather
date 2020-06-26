import { FileType, FileStat, Uri, workspace } from "vscode";
import { error } from "console";

export async function pathExists(
  // the "file" to look for
  filename: string,
  // the file type to expect; if not provided then any file type
  // matches; otherwise a mismatch results in a "false" value
  fileType?: FileType
): Promise<boolean> {
  let stat: FileStat;
  try {
    // Note that we are using stat() rather than lstat().  This
    // means that any symlinks are getting resolved.
    const uri = Uri.file(filename);
    stat = await workspace.fs.stat(uri);
  } catch (err) {
    error(`stat() failed for "${filename}"`, err);
    return false;
  }

  if (fileType === undefined) {
    return true;
  }
  if (fileType === FileType.Unknown) {
    // FileType.Unknown == 0, hence do not use bitwise operations.
    return stat.type === FileType.Unknown;
  }
  return (stat.type & fileType) === fileType;
}
