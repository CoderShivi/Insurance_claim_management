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
                });
            }

            this.getOwnerComponent().getRouter()
                .getRoute("claims")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        onKpiPendingApproval: function () {
            this.getOwnerComponent().getRouter().navTo("claims", {
                "?query": { status: "PendingApproval,UnderReview" }
            });
        },

        _onRouteMatched: function (oEvent) {
            var oQuery = oEvent.getParameter("arguments")["?query"] || {};
            this._applyStatusFromQuery(oQuery.status);
        },

        _applyStatusFromQuery: function (sStatus) {
            var oTable = this.byId("claimsTable");
            var oBinding = oTable.getBinding("items");
            var oComboBox = this.byId("statusFilter");

            if (!oBinding) {
                return;
            }

            var sExistingSearch = this.byId("claimsSearch")
                ? this.byId("claimsSearch").getValue()
                : "";

            var aFilters = [];

            if (sExistingSearch) {
                aFilters.push(new Filter("claimNumber", FilterOperator.Contains, sExistingSearch));
            }

            if (sStatus) {
                var aStatuses = sStatus.split(",");

                if (aStatuses.length > 1) {
                    aFilters.push(
                        new Filter({
                            filters: aStatuses.map(function (s) {
                                return new Filter("status", FilterOperator.EQ, s);
                            }),
                            and: false
                        })
                    );
                } else {
                    aFilters.push(new Filter("status", FilterOperator.EQ, aStatuses[0]));
                }

                if (oComboBox && aStatuses.length === 1) {
                    var oMatch = oComboBox.getItems().filter(function (oItem) {
                        return oItem.getKey() === aStatuses[0];
                    })[0];

                    if (oMatch) {
                        oComboBox.setSelectedItem(oMatch);
                    }
                }
            } else if (oComboBox) {
                oComboBox.setSelectedKey(null);
            }

            oBinding.filter(aFilters);
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
                    id: "createClaim",
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
            this._resetCreateClaimForm();
        },

        onDocumentFileChange: function (oEvent) {
            var aFiles = oEvent.getParameter("files");
            this._oSelectedFile = (aFiles && aFiles.length) ? aFiles[0] : null;
        },

        onConfirmCreateClaim: function () {
            var oDialog = this._oCreateClaimDialog;

            var oCustomer = Fragment.byId("createClaim", "ccCustomer");
            var oPolicy = Fragment.byId("createClaim", "ccPolicy");
            var oClaimType = Fragment.byId("createClaim", "ccClaimType");
            var oAmount = Fragment.byId("createClaim", "ccAmount");
            var oDate = Fragment.byId("createClaim", "ccDate");
            var oDesc = Fragment.byId("createClaim", "ccDesc");

            if (!oCustomer || !oPolicy || !oClaimType) {
                MessageBox.error("Unable to find claim form controls.");
                return;
            }

            var sCustomerId = oCustomer.getSelectedKey();
            var sPolicyId = oPolicy.getSelectedKey();
            var sClaimTypeId = oClaimType.getSelectedKey();

            var fAmount = parseFloat(oAmount.getValue());
            var sDate = oDate.getValue();
            var sDescription = oDesc.getValue();

            if (!sCustomerId || !sPolicyId || !sClaimTypeId) {
                MessageBox.warning(
                    "Please select customer, policy and claim type."
                );
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

             if (!this._oSelectedFile) {
                MessageBox.warning("Please attach a supporting document.");
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
                    var sClaimId = oContext.getProperty("ID");

                    if (this._oSelectedFile) {
                        this._createAndUploadDocument(sClaimId, this._oSelectedFile);
                    }

                    MessageToast.show("Claim created successfully.");

                    oDialog.close();
                    this._resetCreateClaimForm();

                    this.getOwnerComponent()
                        .getRouter()
                        .navTo("claimDetail", {
                            claimId: sClaimId
                        });
                }.bind(this))
                .catch(function (oError) {
                    console.error("Create claim error:", oError);

                    MessageBox.error(
                        oError.message || "Failed to create claim."
                    );
                });
        },

        _createAndUploadDocument: function (sClaimId, oFile) {
            var oModel = this.getView().getModel();
            var oDocBinding = oModel.bindList("/Claims(" + sClaimId + ")/documents");

            var oDocContext = oDocBinding.create({
                documentType: "Supporting",
                fileName: oFile.name,
                mediaType: oFile.type || "application/octet-stream"
            });

            oDocContext.created()
                .then(function () {
                    var sDocId = oDocContext.getProperty("ID");
                    this._uploadFileContent(sClaimId, sDocId, oFile);
                }.bind(this))
                .catch(function (oError) {
                    console.error("Create document error:", oError);
                    MessageBox.error("Claim was created, but the document record could not be saved.");
                });
        },

        _uploadFileContent: function (sClaimId, sDocId, oFile) {
            var oModel = this.getView().getModel();
            var sBaseUrl = oModel.getServiceUrl();
            var sUrl = sBaseUrl.replace(/\/$/, "") +
                "/Claims(" + sClaimId + ")/documents(" + sDocId + ")/content";

            fetch(sUrl, { method: "HEAD", headers: { "X-CSRF-Token": "Fetch" } })
                .then(function (oResp) {
                    var sToken = oResp.headers.get("X-CSRF-Token");
                    return fetch(sUrl, {
                        method: "PUT",
                        headers: {
                            "Content-Type": oFile.type || "application/octet-stream",
                            "X-CSRF-Token": sToken
                        },
                        body: oFile,
                        credentials: "include"
                    });
                })
                .then(function (oPutResp) {
                    if (oPutResp.ok) {
                        MessageToast.show("Document uploaded.");
                    } else {
                        MessageBox.error("Failed to upload the document file.");
                    }
                })
                .catch(function (oError) {
                    console.error("Upload error:", oError);
                    MessageBox.error("Failed to upload the document file.");
                });
        },

        _resetCreateClaimForm: function () {
            var oFileUploader = Fragment.byId("createClaim", "ccFile");
            if (oFileUploader) {
                oFileUploader.clear();
            }
            this._oSelectedFile = null;
        }
    });
});