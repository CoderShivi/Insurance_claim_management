sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "claimsure/app/model/formatter"
], function (Controller, Filter, FilterOperator, MessageToast, MessageBox, formatter) {
    "use strict";

    return Controller.extend("claimsure.app.controller.Policies", {
        formatter: formatter,

        onSearch: function (oEvent) {
            var sQuery = (oEvent.getParameter("newValue") || oEvent.getParameter("query") || "").trim();
            var oBinding = this.byId("policiesTable").getBinding("items");
            var aFilters = sQuery ? [new Filter("policyNumber", FilterOperator.Contains, sQuery)] : [];
            oBinding.filter(aFilters);
        },

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
        }
    });
});