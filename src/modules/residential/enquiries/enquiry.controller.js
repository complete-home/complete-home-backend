import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import { Messages } from "../../../core/http/messages.js";
import * as enquiryService from "./enquiry.service.js";

export const list = asyncHandler(async (req, res) => {
  const moduleId = req.query.module || req.businessModule;
  const data = await enquiryService.listEnquiries({
    moduleId,
    search: req.query.search,
    status: req.query.status,
    source: req.query.source,
    talkingPoint: req.query.talkingPoint,
    salesHeadId: req.query.salesHeadId,
    projectHeadId: req.query.projectHeadId,
    month: req.query.month,
    page: req.query.page,
    limit: req.query.limit,
  });
  sendSuccess(res, data);
});

export const getOne = asyncHandler(async (req, res) => {
  const data = await enquiryService.getEnquiryById(req.params.id);
  sendSuccess(res, data);
});

export const getDetail = asyncHandler(async (req, res) => {
  const data = await enquiryService.getEnquiryDetail(
    req.params.id,
    req.query.quotationId,
  );
  sendSuccess(res, data);
});

export const create = asyncHandler(async (req, res) => {
  const data = await enquiryService.createEnquiry(req.body, req.user);
  sendSuccess(res, data, 201);
});

export const update = asyncHandler(async (req, res) => {
  const data = await enquiryService.updateEnquiry(req.params.id, req.body);
  sendSuccess(res, data);
});

export const updateStatus = asyncHandler(async (req, res) => {
  const data = await enquiryService.updateEnquiryStatus(
    req.params.id,
    req.body.status,
  );
  sendSuccess(res, data);
});

export const addFollowUp = asyncHandler(async (req, res) => {
  const data = await enquiryService.addFollowUp(req.params.id, req.body);
  sendSuccess(res, data);
});

export const listTalkingPoints = asyncHandler(async (req, res) => {
  const { listTalkingPoints: listTp } =
    await import("./enquiryTalkingPoint.service.js");
  sendSuccess(res, await listTp(req.params.id));
});

export const addTalkingPoint = asyncHandler(async (req, res) => {
  const { addTalkingPoint: addTp } =
    await import("./enquiryTalkingPoint.service.js");
  sendSuccess(res, await addTp(req.params.id, req.body, req.user), 201);
});

export const deleteTalkingPoint = asyncHandler(async (req, res) => {
  const { deleteTalkingPoint: delTp } =
    await import("./enquiryTalkingPoint.service.js");
  sendSuccess(res, await delTp(req.params.id, req.params.logId));
});

export const upsertAppointment = asyncHandler(async (req, res) => {
  const data = await enquiryService.upsertAppointment(req.params.id, req.body);
  sendSuccess(res, data);
});

export const addPayment = asyncHandler(async (req, res) => {
  const data = await enquiryService.addPayment(req.params.id, req.body);
  sendSuccess(res, data);
});

export const convertToProject = asyncHandler(async (req, res) => {
  const { convertEnquiryToProject } =
    await import("../projects/project.service.js");
  const data = await convertEnquiryToProject(req.params.id, req.body);
  sendSuccess(res, data, 201);
});

export const upsertQuotation = asyncHandler(async (req, res) => {
  const { upsertEnquiryQuotation } =
    await import("../quotations/quotation.service.js");
  sendSuccess(res, await upsertEnquiryQuotation(req.params.id, req.body));
});

export const addQuotationItem = asyncHandler(async (req, res) => {
  const { addQuotationItem } =
    await import("../quotations/quotation.service.js");
  sendSuccess(res, await addQuotationItem(req.params.id, req.body));
});

export const updateFollowUp = asyncHandler(async (req, res) => {
  const data = await enquiryService.updateFollowUp(
    req.params.id,
    req.params.followUpId,
    req.body,
  );
  sendSuccess(res, data);
});

export const deleteFollowUp = asyncHandler(async (req, res) => {
  const data = await enquiryService.deleteFollowUp(
    req.params.id,
    req.params.followUpId,
  );
  sendSuccess(res, data);
});

export const sendClientInvite = asyncHandler(async (req, res) => {
  const { createClientInvite } = await import("./clientInvite.service.js");
  sendSuccess(res, await createClientInvite(req.params.id, req.user), 201);
});

export const createPaymentLink = asyncHandler(async (req, res) => {
  const data = await enquiryService.createPaymentLink(req.params.id, req.body);
  sendSuccess(res, data);
});

export const listQuotations = asyncHandler(async (req, res) => {
  const { listEnquiryQuotations } =
    await import("../quotations/quotation.service.js");
  sendSuccess(res, await listEnquiryQuotations(req.params.id));
});

export const applyQuotationTemplate = asyncHandler(async (req, res) => {
  const { applyTemplateToEnquiry } =
    await import("../quotations/quotation.service.js");
  sendSuccess(
    res,
    await applyTemplateToEnquiry(req.params.id, req.body, req.user),
    201,
  );
});

export const getQuotationPdf = asyncHandler(async (req, res) => {
  const { buildQuotationPdfHtml } =
    await import("../quotations/quotationPdf.service.js");
  const html = await buildQuotationPdfHtml(
    req.params.id,
    req.params.quotationId,
  );
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export const refreshQuotationCatalog = asyncHandler(async (req, res) => {
  const { refreshQuotationFromCatalog } =
    await import("../quotations/quotation.service.js");
  sendSuccess(
    res,
    await refreshQuotationFromCatalog(
      req.params.id,
      req.params.quotationId,
      req.user,
    ),
  );
});

export const resetQuotationTemplate = asyncHandler(async (req, res) => {
  const { resetQuotationToTemplate } =
    await import("../quotations/quotation.service.js");
  sendSuccess(
    res,
    await resetQuotationToTemplate(
      req.params.id,
      req.params.quotationId,
      req.body,
      req.user,
    ),
  );
});

export const updateQuotationItem = asyncHandler(async (req, res) => {
  const { updateQuotationItem: applyUpdate } =
    await import("../quotations/quotation.service.js");
  sendSuccess(
    res,
    await applyUpdate(
      req.params.id,
      req.params.quotationId,
      req.params.itemId,
      req.body,
    ),
  );
});

export const deleteQuotationItem = asyncHandler(async (req, res) => {
  const { deleteQuotationItem: applyDelete } =
    await import("../quotations/quotation.service.js");
  sendSuccess(
    res,
    await applyDelete(
      req.params.id,
      req.params.quotationId,
      req.params.itemId,
      req.query.listType || req.body?.listType,
    ),
  );
});

export const setPrimaryQuotation = asyncHandler(async (req, res) => {
  const { setPrimaryEnquiryQuotation } =
    await import("../quotations/quotation.service.js");
  sendSuccess(
    res,
    await setPrimaryEnquiryQuotation(req.params.id, req.params.quotationId),
  );
});

export const duplicateQuotation = asyncHandler(async (req, res) => {
  const { duplicateEnquiryQuotation } =
    await import("../quotations/quotation.service.js");
  sendSuccess(
    res,
    await duplicateEnquiryQuotation(req.params.id, req.body, req.user),
    201,
  );
});

export const sendQuotation = asyncHandler(async (req, res) => {
  const { sendEnquiryQuotation } =
    await import("../quotations/quotation.service.js");
  const quotationId = req.body?.quotationId || req.query?.quotationId;
  sendSuccess(
    res,
    await sendEnquiryQuotation(req.params.id, req.user, quotationId),
  );
});

export const approveQuotation = asyncHandler(async (req, res) => {
  const { approveEnquiryQuotation } =
    await import("../quotations/quotation.service.js");
  sendSuccess(
    res,
    await approveEnquiryQuotation(req.params.id, req.user, req.body?.comment),
  );
});

export const clientQuotationAction = asyncHandler(async (req, res) => {
  const { clientQuotationAction: applyAction } =
    await import("../quotations/quotation.service.js");
  sendSuccess(res, await applyAction(req.params.id, req.body, req.user));
});

export const reopenQuotation = asyncHandler(async (req, res) => {
  const { reopenEnquiryQuotation } =
    await import("../quotations/quotation.service.js");
  const quotationId = req.body?.quotationId || req.query?.quotationId;
  sendSuccess(
    res,
    await reopenEnquiryQuotation(req.params.id, req.user, quotationId),
  );
});

export const paymentClientAction = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await enquiryService.paymentClientAction(
      req.params.id,
      req.params.paymentId,
      req.body,
      req.user,
    ),
  );
});
