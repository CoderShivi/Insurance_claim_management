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
            // Local JSON model backing the Create/Edit dialog form fields.
            var oDialogModel = new JSONModel({
                dialogTitle: "",
                mode: "create",     // "create" | "edit"
                ID: null,           // set only in edit mode
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

            this._loadLookups();
        },

        // =================================================================
        // Lookups: STATIC data (per request) instead of fetching from the
        // backend. IDs below match what's visible in your Policies table
        // (customer_ID / claimType_ID columns). Names for POL002-POL008
        // match what your app showed before the columns broke; POL001 and
        // POL009 names are placeholders ("Ravi Kumar", "Test Customer") —
        // replace them with the real values if different.
        //
        // Add/edit rows here as your real customers/claim types change —
        // this is the single place both the table columns and the Create/
        // Edit dialog dropdowns read from.
        // =================================================================

        _loadLookups: function () {
            var oLookupModel = new JSONModel({
                customers: [
                    { ID: "11111111-1111-1111-1111-111111111111", name: "Ravi Kumar" },
                    { ID: "22222222-2222-2222-2222-222222222222", name: "Anita Sharma" },
                    { ID: "33333333-3333-3333-3333-333333333333", name: "Arjun Reddy" },
                    { ID: "44444444-4444-4444-4444-444444444444", name: "Priya Patel" },
                    { ID: "55555555-5555-5555-5555-555555555555", name: "Vikram Singh" },
                    { ID: "66666666-6666-6666-6666-666666666666", name: "Neha Verma" },
                    { ID: "77777777-7777-7777-7777-777777777777", name: "Karan Mehta" },
                    { ID: "88888888-8888-8888-8888-888888888888", name: "Sneha Iyer" },
                    { ID: "99999999-9999-9999-9999-999999999999", name: "Test Customer" }
                ],
                claimTypes: [
                    { ID: "a1000001-0001-0001-0001-000000000001", name: "Vehicle Accident" },
                    { ID: "a1000002-0002-0002-0002-000000000002", name: "Vehicle Theft" },
                    { ID: "a1000003-0003-0003-0003-000000000003", name: "Vehicle Damage" },
                    { ID: "a1000004-0004-0004-0004-000000000004", name: "Medical Expense" },
                    { ID: "a1000005-0005-0005-0005-000000000005", name: "Hospitalization" },
                    { ID: "a1000006-0006-0006-0006-000000000006", name: "Emergency Treatment" },
                    { ID: "a1000007-0007-0007-0007-000000000007", name: "Property Damage" },
                    { ID: "a1000008-0008-0008-0008-000000000008", name: "Fire Damage" },
                    { ID: "a1000009-0009-0009-0009-000000000009", name: "Theft Damage" }
                ]
            });
            this.getView().setModel(oLookupModel, "lookups");
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

        onCancelPolicy: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext();
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

        onEditPolicy: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext();
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
                // Normalize to yyyy-MM-dd for the DatePicker's valueFormat
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

        onDeletePolicy: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext();
            var sPolicyNumber = oCtx.getProperty("policyNumber");

            MessageBox.confirm("Delete policy " + sPolicyNumber + "? This cannot be undone.", {
                title: "Confirm Delete",
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }
                    oCtx.delete().then(function () {
                        MessageToast.show("Policy deleted");
                    }).catch(function (oErr) {
                        console.error("[Policies] Delete failed", oErr);
                        MessageBox.error(oErr.message || "Could not delete policy.");
                    });
                }
            });
        }
    });
});