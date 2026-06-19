import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import * as masterService from "./master.service.js";

export const listClients = asyncHandler(async (req, res) => {
  sendSuccess(res, await masterService.listClients());
});

export const listVendors = asyncHandler(async (req, res) => {
  sendSuccess(res, await masterService.listVendors());
});

export const listProducts = asyncHandler(async (req, res) => {
  sendSuccess(res, await masterService.listProducts());
});

export const listServices = asyncHandler(async (req, res) => {
  sendSuccess(res, await masterService.listServices());
});

export const createVendor = asyncHandler(async (req, res) => {
  sendSuccess(res, await masterService.createVendor(req.body), 201);
});

export const createClient = asyncHandler(async (req, res) => {
  sendSuccess(res, await masterService.createClient(req.body), 201);
});

export const createProduct = asyncHandler(async (req, res) => {
  sendSuccess(res, await masterService.createProduct(req.body), 201);
});

export const createService = asyncHandler(async (req, res) => {
  sendSuccess(res, await masterService.createService(req.body), 201);
});

export const updateVendor = asyncHandler(async (req, res) => {
  sendSuccess(res, await masterService.updateVendor(req.params.id, req.body));
});

export const deleteVendor = asyncHandler(async (req, res) => {
  sendSuccess(res, await masterService.deleteVendor(req.params.id));
});

export const updateClient = asyncHandler(async (req, res) => {
  sendSuccess(res, await masterService.updateClient(req.params.id, req.body));
});

export const deleteClient = asyncHandler(async (req, res) => {
  sendSuccess(res, await masterService.deleteClient(req.params.id));
});

export const updateProduct = asyncHandler(async (req, res) => {
  sendSuccess(res, await masterService.updateProduct(req.params.id, req.body));
});

export const deleteProduct = asyncHandler(async (req, res) => {
  sendSuccess(res, await masterService.deleteProduct(req.params.id));
});

export const updateService = asyncHandler(async (req, res) => {
  sendSuccess(res, await masterService.updateService(req.params.id, req.body));
});

export const deleteService = asyncHandler(async (req, res) => {
  sendSuccess(res, await masterService.deleteService(req.params.id));
});

export const listProductCategories = asyncHandler(async (req, res) => {
  sendSuccess(res, await masterService.listProductCategories());
});

export const listProductCategoryTitles = asyncHandler(async (req, res) => {
  sendSuccess(res, await masterService.listProductCategoryTitles());
});

export const getProductCategoryDescriptions = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await masterService.getProductCategoryDescriptions(req.params.title),
  );
});

export const addProductCategoryDescription = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await masterService.addProductCategoryDescription(req.body),
    201,
  );
});

export const deleteProductCategoryDescription = asyncHandler(
  async (req, res) => {
    sendSuccess(
      res,
      await masterService.deleteProductCategoryDescription(
        req.params.id,
        req.params.descId,
      ),
    );
  },
);
