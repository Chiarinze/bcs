export interface RawGrant {
  title: string;
  description?: string;
  external_url: string;
  deadline?: string;
  amount?: string;
}

export interface GrantSource {
  name: string;
  url: string;
  fetch: () => Promise<RawGrant[]>;
}

import { fetchOpportunityDesk } from "./adapters/opportunity-desk";
import { fetchArtsCouncilEngland } from "./adapters/arts-council-england";
import { fetchStaticGrants } from "./adapters/static-grants";

export const sources: GrantSource[] = [
  {
    name: "Opportunity Desk",
    url: "https://opportunitydesk.org",
    fetch: fetchOpportunityDesk,
  },
  {
    name: "Arts Council England",
    url: "https://www.artscouncil.org.uk",
    fetch: fetchArtsCouncilEngland,
  },
  {
    name: "Curated Grants",
    url: "local",
    fetch: fetchStaticGrants,
  },
];
