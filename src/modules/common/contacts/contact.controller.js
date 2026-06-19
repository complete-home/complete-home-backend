import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import * as contactService from "./contact.service.js";

export const listContacts = asyncHandler(async (req, res) => {
  sendSuccess(res, await contactService.listContacts(req.user.id, req.query));
});

export const getContact = asyncHandler(async (req, res) => {
  sendSuccess(res, await contactService.getContactDetail(req.params.id, req.user.id));
});

export const createContact = asyncHandler(async (req, res) => {
  sendSuccess(res, await contactService.createContact(req.body, req.user.id), 201);
});

export const updateContact = asyncHandler(async (req, res) => {
  sendSuccess(res, await contactService.updateContact(req.params.id, req.body, req.user.id));
});

export const deleteContact = asyncHandler(async (req, res) => {
  sendSuccess(res, await contactService.deleteContact(req.params.id, req.user.id));
});

export const shareContact = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await contactService.shareContact(
      req.params.id,
      req.body.sharedWithUserIds,
      req.user.id,
    ),
  );
});

export const logCall = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await contactService.logContactCall(req.params.id, req.body, req.user.id),
    201,
  );
});

export const importFromCrm = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await contactService.importContactsFromCrm(req.user.id, req.body),
  );
});
