import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import * as taskService from "./task.service.js";

export const list = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await taskService.listTasks({
      moduleId: req.query.module,
      projectId: req.query.projectId,
    }),
  );
});

export const getOne = asyncHandler(async (req, res) => {
  sendSuccess(res, await taskService.getTaskById(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  sendSuccess(res, await taskService.createTask(req.body), 201);
});

export const update = asyncHandler(async (req, res) => {
  sendSuccess(res, await taskService.updateTask(req.params.id, req.body));
});

export const remove = asyncHandler(async (req, res) => {
  sendSuccess(res, await taskService.deleteTask(req.params.id));
});

export const assignees = asyncHandler(async (req, res) => {
  sendSuccess(res, await taskService.listAssignees());
});
