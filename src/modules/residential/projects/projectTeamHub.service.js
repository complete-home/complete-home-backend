import AppError from "../../../core/errors/AppError.js";
import Project from "./project.model.js";
import { defaultTeamHub } from "./projectTeamHub.defaults.js";

function mergeTeamHub(stored) {
  const base = defaultTeamHub();
  if (!stored || typeof stored !== "object") return base;
  return {
    bdp: { ...base.bdp, ...(stored.bdp || {}) },
    psq: {
      ...base.psq,
      ...(stored.psq || {}),
      purchase: {
        ...base.psq.purchase,
        ...(stored.psq?.purchase || {}),
      },
    },
  };
}

export async function getProjectTeamHub(projectId) {
  const project = await Project.findById(projectId).select("teamHub").lean();
  if (!project) throw AppError.notFound("Project not found");
  return mergeTeamHub(project.teamHub);
}

export async function updateProjectTeamHub(projectId, patch) {
  const project = await Project.findById(projectId);
  if (!project) throw AppError.notFound("Project not found");

  const current = mergeTeamHub(project.teamHub);
  const next = {
    bdp: { ...current.bdp, ...(patch.bdp || {}) },
    psq: {
      ...current.psq,
      ...(patch.psq || {}),
      purchase: {
        ...current.psq.purchase,
        ...(patch.psq?.purchase || {}),
      },
    },
  };

  project.teamHub = next;
  await project.save();
  return next;
}
