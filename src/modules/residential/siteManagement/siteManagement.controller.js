import * as siteManagementService from "./siteManagement.service.js";

export async function get(req, res, next) {
  try {
    const data = await siteManagementService.getProjectSiteManagement(
      req.params.id,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function initialize(req, res, next) {
  try {
    const data = await siteManagementService.initializeProjectSiteManagement(
      req.params.id,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const data = await siteManagementService.updateProjectSiteManagement(
      req.params.id,
      req.body,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function addRow(req, res, next) {
  try {
    const data = await siteManagementService.addSiteManagementRow(
      req.params.id,
      req.body,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function removeRow(req, res, next) {
  try {
    const data = await siteManagementService.removeSiteManagementRow(
      req.params.id,
      { section: req.query.section, rowId: req.params.rowId },
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
