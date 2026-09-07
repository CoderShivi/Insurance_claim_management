sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "../model/formatter"
], function (
    Controller,
    Filter,
    FilterOperator,
    MessageToast,
    MessageBox,
    Fragment,
    formatter
) {
    "use strict";

    return Controller.extend("claimsure.app.controller.Claims", {
        formatter: formatter,

        onInit: function () {
            var oTable = this.byId("claimsTable");
            var oBinding = oTable.getBinding("items");

            if (oBinding) {
                oBinding.attachDataReceived(function (oEvent) {
                    if (oEvent.getParameter("error")) {
                        console.error("Error loading claims");
                        return;
                    }

                    // Temporary diagnostic — remove once confirmed working
                    var aItems = oTable.getItems();
                    aItems.forEach(function (oItem) {
                        var oContext = oItem.getBindingContext();
                        if (oContext) {
                            console.log(
                                "Claim:", oContext.getProperty("claimNumber"),
                                "| Status:", JSON.stringify(oContext.getProperty("status"))
                            );
                        }
                    });
                });
            }
        },

        onSearch: function (oEvent) {
            var oTable = this.byId("claimsTable");
            var oBinding = oTable.getBinding("items");
            var sQuery = oEvent.getParameter("newValue") || oEvent.getParameter("query") || "";
            var aFilters = [];

            var oStatusFilter = this._getStatusFilter();

            if (oStatusFilter) {
                aFilters.push(oStatusFilter);
            }

            if (sQuery) {
                aFilters.push(
                    new Filter("claimNumber", FilterOperator.Contains, sQuery)
                );
            }

            oBinding.filter(aFilters);
        },

        onStatusFilterChange: function () {
            var oTable = this.byId("claimsTable");
            var oBinding = oTable.getBinding("items");
            var aFilters = [];

            var oStatusFilter = this._getStatusFilter();

            if (oStatusFilter) {
                aFilters.push(oStatusFilter);
            }

            var sQuery = this.byId("claimsSearch").getValue();

            if (sQuery) {
                aFilters.push(
                    new Filter("claimNumber", FilterOperator.Contains, sQuery)
                );
            }

            oBinding.filter(aFilters);
        },

        _getStatusFilter: function () {
            var oComboBox = this.byId("statusFilter");
            var oItem = oComboBox.getSelectedItem();

            if (!oItem) {
                return null;
            }

            return new Filter("status", FilterOperator.EQ, oItem.getKey());
        },

        onClaimPress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();

            if (!oContext) {
                return;
            }

            var sClaimId = oContext.getProperty("ID");

            this.getOwnerComponent()
                .getRouter()
                .navTo("claimDetail", { claimId: sClaimId });
        },

        onGoForApproval: function (oEvent) {
            var oButton = oEvent.getSource();
            var oContext = oButton.getBindingContext();

            if (!oContext) {
                MessageBox.error("Unable to read claim details.");
                return;
            }

            var sClaimId = oContext.getProperty("ID");
            var sClaimNumber = oContext.getProperty("claimNumber");
            var sStatus = oContext.getProperty("status");

            if (!sClaimId) {
                MessageBox.error("Claim ID is missing.");
                return;
            }

            if (sStatus !== "Submitted") {
                MessageBox.warning("Only submitted claims can be sent for approval.");
                return;
            }

            MessageBox.confirm(
                "Do you want to send claim " + sClaimNumber + " for approval?",
                {
                    title: "Go for Approval",
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            this._submitClaimForApproval(sClaimId, sClaimNumber);
                        }
                    }.bind(this)
                }
            );
        },

        _submitClaimForApproval: function (sClaimId, sClaimNumber) {
            var oModel = this.getView().getModel();

            if (!oModel) {
                MessageBox.error("OData model is not available.");
                return;
            }

            var oAction = oModel.bindContext("/submitClaim(...)");
            oAction.setParameter("claimID", sClaimId);

            oAction.execute()
                .then(function () {
                    MessageToast.show("Claim " + sClaimNumber + " sent for approval.");

                    var oTable = this.byId("claimsTable");
                    var oBinding = oTable.getBinding("items");

                    if (oBinding) {
                        oBinding.refresh();
                    }
                }.bind(this))
                .catch(function (oError) {
                    console.error("submitClaim error:", oError);
                    MessageBox.error(oError.message || "Failed to send claim for approval.");
                });
        },

        onCreateClaim: function () {
            if (!this._oCreateClaimDialog) {
                Fragment.load({
                    name: "claimsure.app.view.CreateClaimDialog",
                    controller: this
                }).then(function (oDialog) {
                    this._oCreateClaimDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    oDialog.open();
                }.bind(this));
            } else {
                this._oCreateClaimDialog.open();
            }
        },

        onCancelCreateClaim: function () {
            if (this._oCreateClaimDialog) {
                this._oCreateClaimDialog.close();
            }
        },

        onConfirmCreateClaim: function () {
            var oDialog = this._oCreateClaimDialog;

            var sCustomerId = oDialog.byId("ccCustomer").getSelectedKey();
            var sPolicyId = oDialog.byId("ccPolicy").getSelectedKey();
            var sClaimTypeId = oDialog.byId("ccClaimType").getSelectedKey();
            var fAmount = parseFloat(oDialog.byId("ccAmount").getValue());
            var sDate = oDialog.byId("ccDate").getValue();
            var sDescription = oDialog.byId("ccDesc").getValue();

            if (!sCustomerId || !sPolicyId || !sClaimTypeId) {
                MessageBox.warning("Please select customer, policy and claim type.");
                return;
            }

            if (!fAmount || fAmount <= 0) {
                MessageBox.warning("Please enter a valid claim amount.");
                return;
            }

            if (!sDate) {
                MessageBox.warning("Please enter the incident date.");
                return;
            }

            var oModel = this.getView().getModel();

            if (!oModel) {
                MessageBox.error("OData model is not available.");
                return;
            }

            var oListBinding = oModel.bindList("/Claims");

            var oContext = oListBinding.create({
                claimNumber: "CLM-" + Date.now(),
                customer_ID: sCustomerId,
                policy_ID: sPolicyId,
                claimType_ID: sClaimTypeId,
                claimedAmount: fAmount,
                incidentDate: sDate,
                description: sDescription,
                status: "Submitted"
            });

            oContext.created()
                .then(function () {
                    MessageToast.show("Claim created successfully.");
                    oDialog.close();

                    var sClaimId = oContext.getProperty("ID");

                    this.getOwnerComponent()
                        .getRouter()
                        .navTo("claimDetail", { claimId: sClaimId });
                }.bind(this))
                .catch(function (oError) {
                    console.error("Create claim error:", oError);
                    MessageBox.error(oError.message || "Failed to create claim.");
                });
        }
    });
});