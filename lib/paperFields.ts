/**
 * Validates the optional paper-presentation answers on a public
 * registration. Returns the columns to store, or an error message.
 */
export function paperFields(
  collect: boolean,
  input: { affiliation?: unknown; presenting_paper?: unknown; paper_title?: unknown }
):
  | { affiliation: string | null; presenting_paper: boolean | null; paper_title: string | null }
  | { error: string } {
  if (!collect) return { affiliation: null, presenting_paper: null, paper_title: null };

  const affiliation = typeof input.affiliation === "string" ? input.affiliation.trim().slice(0, 200) : "";
  if (!affiliation) return { error: "Institutional affiliation is required" };

  if (typeof input.presenting_paper !== "boolean") {
    return { error: "Please tell us whether you are presenting a paper" };
  }

  const title = typeof input.paper_title === "string" ? input.paper_title.trim().slice(0, 300) : "";
  if (input.presenting_paper && !title) return { error: "Please enter the title of your paper" };

  return {
    affiliation,
    presenting_paper: input.presenting_paper,
    paper_title: input.presenting_paper ? title : null,
  };
}
