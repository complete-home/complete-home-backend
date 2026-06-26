function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function defaultWorkflowSections(names) {
  return names.map((name) => ({
    id: uid("sec"),
    name,
    workflows: [],
  }));
}

export function defaultTeamHub() {
  return {
    bdp: {
      otMembers: [],
      planDesignSections: defaultWorkflowSections([
        "Concept & Test",
        "Structural Drawing",
        "Interior Drawing",
      ]),
      materials: [],
    },
    psq: {
      contactTabs: [
        { id: "execution", name: "Execution", type: "execution", members: [] },
        { id: "vendor", name: "Vendor", type: "vendor", members: [] },
        { id: "manpower", name: "Manpower", type: "manpower", members: [] },
      ],
      executionSections: defaultWorkflowSections([
        "Civil Works",
        "Electrical",
        "Waterproofing",
        "Flooring",
        "HVAC & AC",
        "Ceiling Systems",
      ]),
      purchase: {
        vendorTypes: [
          { id: uid("vt"), name: "Electrical Material Vendors" },
          { id: uid("vt"), name: "Plumbing Material Vendors" },
          { id: uid("vt"), name: "Tiles Material Vendors" },
        ],
        quotations: [],
        history: [],
      },
    },
  };
}

export { uid };
