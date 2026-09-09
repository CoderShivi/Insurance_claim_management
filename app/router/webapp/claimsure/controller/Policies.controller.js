sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, Filter, FilterOperator, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("claimsure.app.controller.Policies", {

onInit: function () {
    var oDialogModel = new JSONModel({
        dialogTitle: "",
        mode: "create",
        ID: null,
        policyNumber: "",
        customer_ID: "",
        claimType_ID: "",
        coverageLimit: "",
        startDate: "",
        endDate: "",
        status: "Active",
        busy: false
    });
    this.getView().setModel(oDialogModel, "policyDialog");

    // ADD THIS — drives Edit/Cancel/Delete enabled state
    var oToolbarModel = new JSONModel({
        editEnabled: false,
        cancelEnabled: false,
        deleteEnabled: false
    });
    this.getView().setModel(oToolbarModel, "toolbar");

    this._loadLookups();

    this.getOwnerComponent().getRouter()
        .getRoute("policies")
        .attachPatternMatched(this._onRouteMatched, this);
},

onSelectionChange: function () {
    var oTable = this.byId("policiesTable");
    var aSelected = oTable.getSelectedItems();
    var oToolbarModel = this.getView().getModel("toolbar");

    if (aSelected.length !== 1) {
        oToolbarModel.setData({
            editEnabled: false,
            cancelEnabled: false,
            deleteEnabled: false
        });
        return;
    }

    var oData = aSelected[0].getBindingContext().getObject();

    oToolbarModel.setData({
        editEnabled: this.canEditPolicy(oData.status),
        cancelEnabled: this.canCancelPolicy(oData.status),
        deleteEnabled: true
    });
},

_getSelectedContext: function () {
    var oTable = this.byId("policiesTable");
    var aSelected = oTable.getSelectedItems();

    if (aSelected.length !== 1) {
        MessageToast.show("Please select exactly one policy.");
        return null;
    }

    return aSelected[0].getBindingContext();
},

_clearSelection: function () {
    var oTable = this.byId("policiesTable");
    oTable.removeSelections(true);
    this.getView().getModel("toolbar").setData({
        editEnabled: false,
        cancelEnabled: false,
        deleteEnabled: false
    });
},

// NEW
_onRouteMatched: function (oEvent) {
    var oQuery = oEvent.getParameter("arguments")["?query"] || {};
    var oTable = this.byId("policiesTable");
    if (!oTable) { return; }

    var oBinding = oTable.getBinding("items");
    if (!oBinding) { return; }

    var aFilters = [];
    if (oQuery.status === "Active") {
        aFilters.push(new Filter("status", FilterOperator.EQ, "Active"));
    }

    oBinding.filter(aFilters);
},
       
_loadLookups: function () {
    var oAdminModel = this.getOwnerComponent().getModel("admin");

    if (!oAdminModel) {
        console.error("[Policies] admin model not found");
        MessageBox.error("MainService model 'admin' not found.");
        return;
    }

    var oLookupModel = new JSONModel({
        customers: [],
        claimTypes: []
    });

    this.getView().setModel(oLookupModel, "lookups");

    // Customers
    var oCustomerBinding = oAdminModel.bindList(
        "/Customers",
        undefined,
        undefined,
        undefined,
        {
            $select: "ID,firstName,lastName"
        }
    );

    // Claim Types
    var oClaimTypeBinding = oAdminModel.bindList(
        "/ClaimTypes",
        undefined,
        undefined,
        undefined,
        {
            $select: "ID,name"
        }
    );

    Promise.all([
        oCustomerBinding.requestContexts(0, 1000),
        oClaimTypeBinding.requestContexts(0, 1000)
    ]).then(function (aResults) {

        // ============================================================
        // CUSTOMERS
        // ============================================================

        var aCustomers = aResults[0].map(function (oContext) {
            var oData = oContext.getObject();

            return {
                ID: oData.ID,
                name: [
                    oData.firstName,
                    oData.lastName
                ].filter(Boolean).join(" ")
            };
        });

        // ============================================================
        // CLAIM TYPES
        // ============================================================

        var aClaimTypes = aResults[1].map(function (oContext) {
            var oData = oContext.getObject();

            return {
                ID: oData.ID,
                name: oData.name
            };
        });

        console.log("[Policies] Customers loaded:", aCustomers);
        console.log("[Policies] Claim Types loaded:", aClaimTypes);

        oLookupModel.setData({
            customers: aCustomers,
            claimTypes: aClaimTypes
        });

    }).catch(function (oError) {

        console.error("[Policies] Lookup loading failed:", oError);

        MessageBox.error(
            "Could not load customers and claim types.\n\n" +
            (oError.message || "Unknown error")
        );
    });
},
        // =================================================================
        // Formatters (plain controller methods, referenced in the view as
        // formatter: '.methodName' — no separate formatter.js file)
        // =================================================================

        idToName: function (sId, aList) {
            if (!sId || !Array.isArray(aList)) {
                return sId || "";
            }
            var oFound = aList.find(function (oItem) {
                return oItem.ID === sId || oItem.id === sId;
            });
            return oFound ? (oFound.name || oFound.text || sId) : sId;
        },

        // FIX for blank Coverage Limit: OData V4 Edm.Decimal fields arrive as
        // STRINGS (e.g. "500000.00"), not JS numbers. parseFloat() first
        // avoids the silent NaN/undefined that made the ObjectNumber render empty.
        formatCurrency: function (vValue) {
            if (vValue === null || vValue === undefined || vValue === "") {
                return "";
            }
            var fValue = parseFloat(vValue);
            if (isNaN(fValue)) {
                return String(vValue);
            }
            return fValue.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        },

        formatShortDate: function (vValue) {
            if (!vValue) {
                return "";
            }
            var oDate = (vValue instanceof Date) ? vValue : new Date(vValue);
            if (isNaN(oDate.getTime())) {
                return String(vValue);
            }
            var dd = String(oDate.getDate()).padStart(2, "0");
            var mm = String(oDate.getMonth() + 1).padStart(2, "0");
            var yyyy = oDate.getFullYear();
            return dd + "/" + mm + "/" + yyyy;
        },

        formatStatusState: function (sStatus) {
            switch (sStatus) {
                case "Active": return "Success";
                case "Pending": return "Warning";
                case "Expired": return "Warning";
                case "Cancelled": return "Error";
                default: return "None";
            }
        },

        canCancelPolicy: function (sStatus) {
            return sStatus === "Active" || sStatus === "Pending";
        },

        canEditPolicy: function (sStatus) {
            return sStatus !== "Cancelled";
        },

        // =================================================================
        // Search
        // =================================================================

        onSearch: function (oEvent) {
            var sQuery = (oEvent.getParameter("newValue") || oEvent.getParameter("query") || "").trim();
            var oBinding = this.byId("policiesTable").getBinding("items");
            var aFilters = sQuery ? [new Filter("policyNumber", FilterOperator.Contains, sQuery)] : [];
            oBinding.filter(aFilters);
        },

        // =================================================================
        // Existing custom actions (unchanged)
        // =================================================================

        _callAction: function (sActionName, sPolicyId, sSuccessMsg) {
            var oModel = this.getOwnerComponent().getModel();
            var oOperation = oModel.bindContext("/" + sActionName + "(...)");
            oOperation.setParameter("policyID", sPolicyId);

            oOperation.execute().then(function () {
                MessageToast.show(sSuccessMsg);
                this.byId("policiesTable").getBinding("items").refresh();
            }.bind(this)).catch(function (oErr) {
                console.error("[Policies] Action " + sActionName + " failed", oErr);
                MessageBox.error(oErr.message || ("Could not " + sActionName + "."));
            });
        },

        onRenewPolicy: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext();
            this._callAction("renewPolicy", oCtx.getProperty("ID"), "Policy renewed");
        },

onCancelPolicy: function () {
    var oCtx = this._getSelectedContext();
    if (!oCtx) { return; }

    MessageBox.confirm("Cancel this policy?", {
        onClose: function (sAction) {
            if (sAction === MessageBox.Action.OK) {
                this._callAction("cancelPolicy", oCtx.getProperty("ID"), "Policy cancelled");
            }
        }.bind(this)
    });
},

        // =================================================================
        // CRUD: Create / Edit (dialog is defined inline in the view, id="policyDialog")
        // =================================================================

        onCreatePolicy: function () {
            var oDialogModel = this.getView().getModel("policyDialog");
            oDialogModel.setData({
                dialogTitle: "Create Policy",
                mode: "create",
                ID: null,
                policyNumber: "",
                customer_ID: "",
                claimType_ID: "",
                coverageLimit: "",
                startDate: "",
                endDate: "",
                status: "Active",
                busy: false
            });
            this.byId("policyDialog").open();
        },

onEditPolicy: function () {
    var oCtx = this._getSelectedContext();
    if (!oCtx) { return; }

    var oData = oCtx.getObject();
    var oDialogModel = this.getView().getModel("policyDialog");

    oDialogModel.setData({
        dialogTitle: "Edit Policy",
        mode: "edit",
        ID: oData.ID,
        policyNumber: oData.policyNumber,
        customer_ID: oData.customer_ID,
        claimType_ID: oData.claimType_ID,
        coverageLimit: oData.coverageLimit,
        startDate: oData.startDate ? new Date(oData.startDate).toISOString().slice(0, 10) : "",
        endDate: oData.endDate ? new Date(oData.endDate).toISOString().slice(0, 10) : "",
        status: oData.status,
        busy: false
    });

    this.byId("policyDialog").open();
},

        _validateDialog: function (oData) {
            if (!oData.policyNumber || !oData.customer_ID || !oData.claimType_ID ||
                !oData.coverageLimit || !oData.startDate || !oData.endDate || !oData.status) {
                MessageBox.warning("Please fill in all required fields.");
                return false;
            }
            if (isNaN(parseFloat(oData.coverageLimit))) {
                MessageBox.warning("Coverage Limit must be a number.");
                return false;
            }
            if (new Date(oData.endDate) < new Date(oData.startDate)) {
                MessageBox.warning("End Date cannot be before Start Date.");
                return false;
            }
            return true;
        },

        onSavePolicy: function () {
            var oDialogModel = this.getView().getModel("policyDialog");
            var oData = oDialogModel.getData();

            if (!this._validateDialog(oData)) {
                return;
            }

            oDialogModel.setProperty("/busy", true);

            var oModel = this.getOwnerComponent().getModel();
            var oPayload = {
                policyNumber: oData.policyNumber,
                customer_ID: oData.customer_ID,
                claimType_ID: oData.claimType_ID,
                coverageLimit: parseFloat(oData.coverageLimit),
                startDate: oData.startDate,
                endDate: oData.endDate,
                status: oData.status
            };

            if (oData.mode === "create") {
                var oListBinding = this.byId("policiesTable").getBinding("items");
                var oContext = oListBinding.create(oPayload);

                oContext.created().then(function () {
                    oDialogModel.setProperty("/busy", false);
                    MessageToast.show("Policy created");
                    this.byId("policyDialog").close();
                }.bind(this)).catch(function (oErr) {
                    oDialogModel.setProperty("/busy", false);
                    console.error("[Policies] Create failed", oErr);
                    MessageBox.error(oErr.message || "Could not create policy.");
                });
            } else {
                // Edit mode: bind directly to the existing entity by key and patch it.
                var oEditContext = oModel.bindContext("/Policies(" + oData.ID + ")").getBoundContext();

                Object.keys(oPayload).forEach(function (sKey) {
                    oEditContext.setProperty(sKey, oPayload[sKey]);
                });

                oModel.submitBatch(oModel.getUpdateGroupId ? oModel.getUpdateGroupId() : "$auto")
                    .then(function () {
                        oDialogModel.setProperty("/busy", false);
                        MessageToast.show("Policy updated");
                        this.byId("policyDialog").close();
                        this.byId("policiesTable").getBinding("items").refresh();
                    }.bind(this))
                    .catch(function (oErr) {
                        oDialogModel.setProperty("/busy", false);
                        console.error("[Policies] Update failed", oErr);
                        MessageBox.error(oErr.message || "Could not update policy.");
                    });
            }
        },

        onCancelPolicyDialog: function () {
            this.byId("policyDialog").close();
        },

onDeletePolicy: function () {
    var oCtx = this._getSelectedContext();
    if (!oCtx) { return; }

    var sPolicyNumber = oCtx.getProperty("policyNumber");

    MessageBox.confirm("Delete policy " + sPolicyNumber + "? This cannot be undone.", {
        title: "Confirm Delete",
        onClose: function (sAction) {
            if (sAction !== MessageBox.Action.OK) {
                return;
            }
            oCtx.delete().then(function () {
                MessageToast.show("Policy deleted");
                this._clearSelection();
            }.bind(this)).catch(function (oErr) {
                console.error("[Policies] Delete failed", oErr);
                MessageBox.error(oErr.message || "Could not delete policy.");
            });
        }.bind(this)
    });
}
    });
});