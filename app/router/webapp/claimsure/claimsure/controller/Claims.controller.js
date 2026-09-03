sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "claimsure/app/model/formatter"
], function (Controller, Filter, FilterOperator, MessageToast, MessageBox, Fragment, formatter) {
    "use strict";

    return Controller.extend("claimsure.app.controller.Claims", {
        formatter: formatter,

        onInit: function () {
            var oTable = this.byId("claimsTable");
            var oBinding = oTable.getBinding("items");

            if (oBinding) {
                oBinding.attachDataReceived(function (oEvent) {
                    var oError = oEvent.getParameter("error");
                    if (oError) {
                        console.error("[Claims] data load error:", oError);
                        MessageToast.show("Could not load claims. Check console for details.");
                    } else {
                        console.log("[Claims] rows loaded:", oBinding.getCurrentContexts().length);
                    }
                });
            }
        },

        onSearch: function (oEvent) {
            var sQuery = (oEvent.getParameter("newValue")
                || oEvent.getParameter("query")
                || "").trim();

            var oBinding = this.byId("claimsTable").getBinding("items");
            var aFilters = this._getStatusFilter();

            if (sQuery) {
                aFilters.push(new Filter("claimNumber", FilterOperator.Contains, sQuery));
            }

            oBinding.filter(aFilters);
        },

        onStatusFilterChange: function () {
            var oBinding = this.byId("claimsTable").getBinding("items");
            oBinding.filter(this._getStatusFilter());
        },

        _getStatusFilter: function () {
            var oComboBox = this.byId("statusFilter");
            var oSelectedItem = oComboBox.getSelectedItem();
            var aFilters = [];

            if (oSelectedItem) {
                aFilters.push(new Filter("status", FilterOperator.EQ, oSelectedItem.getKey()));
            }
            return aFilters;
        },

        onClaimPress: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext();
            var sClaimId = oCtx.getProperty("ID");

            if (!sClaimId) {
                console.error("[Claims] Cannot open claim: no ID on row", oCtx.getObject());
                MessageToast.show("Could not open this claim.");
                return;
            }

            this.getOwnerComponent().getRouter().navTo("claimDetail", { claimId: sClaimId });
        },

        // ---------------------------------------------------------------
        // Create Claim dialog
        // ---------------------------------------------------------------

        onCreateClaim: function () {
            var oView = this.getView();
            if (!this._pCreateDialog) {
                this._pCreateDialog = Fragment.load({
                    id: oView.getId(),
                    name: "claimsure.app.view.CreateClaimDialog",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }
            this._pCreateDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        onCancelCreateClaim: function () {
            this._pCreateDialog.then(function (oDialog) {
                oDialog.close();
            });
        },

        onConfirmCreateClaim: function () {
            var oView = this.getView();
            var sPrefix = oView.getId() + "--";

            var oCustomer = sap.ui.core.Fragment.byId(oView.getId(), "ccCustomer");
            var oPolicy = sap.ui.core.Fragment.byId(oView.getId(), "ccPolicy");
            var oClaimType = sap.ui.core.Fragment.byId(oView.getId(), "ccClaimType");
            var oAmount = sap.ui.core.Fragment.byId(oView.getId(), "ccAmount");
            var oDate = sap.ui.core.Fragment.byId(oView.getId(), "ccDate");
            var oDesc = sap.ui.core.Fragment.byId(oView.getId(), "ccDesc");

            var sCustomerId = oCustomer.getSelectedKey();
            var sPolicyId = oPolicy.getSelectedKey();
            var sClaimTypeId = oClaimType.getSelectedKey();
            var fAmount = parseFloat(oAmount.getValue());
            var sDate = oDate.getValue();

            if (!sCustomerId || !sPolicyId || !sClaimTypeId || !fAmount || fAmount <= 0 || !sDate) {
                MessageToast.show("Please fill in Customer, Policy, Claim Type, a positive Amount and Incident Date.");
                return;
            }

            var oModel = this.getOwnerComponent().getModel(); // InsuranceService
            var oListBinding = oModel.bindList("/Claims");

            var oContext = oListBinding.create({
                claimNumber: "CLM-" + Date.now(),
                customer_ID: sCustomerId,
                policy_ID: sPolicyId,
                claimType_ID: sClaimTypeId,
                claimedAmount: fAmount,
                incidentDate: sDate,
                description: oDesc.getValue() || "",
                status: "Draft"
            });

            oContext.created()
                .then(function () {
                    var sClaimId = oContext.getProperty("ID");
                    MessageToast.show("Claim created");
                    this._pCreateDialog.then(function (oDialog) { oDialog.close(); });
                    if (sClaimId) {
                        this.getOwnerComponent().getRouter().navTo("claimDetail", { claimId: sClaimId });
                    }
                }.bind(this))
                .catch(function (oErr) {
                    console.error("[Claims] Failed to create claim:", oErr);
                    MessageBox.error("Could not create claim: " + (oErr.message || "check console for details."));
                });
        }
    });
});