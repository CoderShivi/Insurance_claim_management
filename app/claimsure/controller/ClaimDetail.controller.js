sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "claimsure/app/model/formatter"
], function (Controller, JSONModel, Filter, FilterOperator, MessageToast, MessageBox, formatter) {
    "use strict";

    return Controller.extend("claimsure.app.controller.ClaimDetail", {
        formatter: formatter,

        onInit: function () {
            this.getView().setModel(new JSONModel({ busy: false }), "claimDetail");

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("claimDetail").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            this._sClaimId = oEvent.getParameter("arguments").claimId;
            this._loadClaim();
        },

        _loadClaim: function () {
            var oModel = this.getOwnerComponent().getModel(); // InsuranceService
            var oDetailModel = this.getView().getModel("claimDetail");
            oDetailModel.setProperty("/busy", true);

            // policy and documents are valid to $expand here — both Policies and
            // ClaimDocuments are exposed in InsuranceService alongside Claims.
            // customer/claimType/assignedAgent are NOT expandable (they live in
            // MainService only) — those are resolved via the shared "lookups"
            // model in the view instead (customer_ID / claimType_ID / assignedAgent_ID
            // are plain foreign-key fields on Claims, always returned).
            var oBinding = oModel.bindContext("/Claims(ID=" + this._sClaimId + ")", undefined, {
                $expand: "policy,documents"
            });

            oBinding.requestObject().then(function (oData) {
                oDetailModel.setData(oData);
                oDetailModel.setProperty("/busy", false);
            }).catch(function (oErr) {
                console.error("[ClaimDetail] Failed to load claim", oErr);
                oDetailModel.setProperty("/busy", false);
                MessageToast.show("Could not load this claim.");
            });

            this._loadFraudRiskScores();
        },

        // FraudRiskScores lives in the separate "Investigation" service, not
        // InsuranceService, so it can never be $expand-ed from Claims — it has
        // to be queried directly and merged into the claimDetail model.
        _loadFraudRiskScores: function () {
            var oInvModel = this.getOwnerComponent().getModel("investigation");
            var oDetailModel = this.getView().getModel("claimDetail");

            if (!oInvModel) {
                console.warn("[ClaimDetail] No 'investigation' model configured");
                return;
            }

            var oBinding = oInvModel.bindList("/FraudRiskScores", undefined, undefined,
                new Filter("claim_ID", FilterOperator.EQ, this._sClaimId),
                { $select: "ID,riskScore,riskLevel", $$operationMode: "Server" }
            );

            oBinding.requestContexts(0, 100).then(function (aContexts) {
                var aScores = aContexts.map(function (oCtx) { return oCtx.getObject(); });
                oDetailModel.setProperty("/fraudRiskScores", aScores);
            }).catch(function (oErr) {
                console.warn("[ClaimDetail] Could not load fraud risk scores", oErr);
                oDetailModel.setProperty("/fraudRiskScores", []);
            });
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("claims");
        },

        _callAction: function (sActionName, sSuccessMsg) {
            var oModel = this.getOwnerComponent().getModel();
            var oOperation = oModel.bindContext("/" + sActionName + "(...)");
            oOperation.setParameter("claimID", this._sClaimId);

            this.getView().getModel("claimDetail").setProperty("/busy", true);

            return oOperation.execute().then(function () {
                MessageToast.show(sSuccessMsg);
                this._loadClaim();
            }.bind(this)).catch(function (oErr) {
                console.error("[ClaimDetail] Action " + sActionName + " failed", oErr);
                this.getView().getModel("claimDetail").setProperty("/busy", false);
                MessageBox.error(oErr.message || ("Could not " + sActionName + "."));
            }.bind(this));
        },

        onSubmitClaim: function () {
            this._callAction("submitClaim", "Claim submitted");
        },

        onApproveClaim: function () {
            MessageBox.confirm("Approve this claim?", {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        this._callAction("approveClaim", "Claim approved");
                    }
                }.bind(this)
            });
        },

        onRejectClaim: function () {
            MessageBox.confirm("Reject this claim?", {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        this._callAction("rejectClaim", "Claim rejected");
                    }
                }.bind(this)
            });
        }
    });
});