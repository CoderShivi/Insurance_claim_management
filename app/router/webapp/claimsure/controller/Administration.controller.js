sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "claimsure/app/model/formatter"
], function (Controller, MessageToast, MessageBox, formatter) {
    "use strict";

    return Controller.extend("claimsure.app.controller.Administration", {
        formatter: formatter,

        onEmployeeActiveChange: function (oEvent) {
            var bNewState = oEvent.getParameter("state");
            var oCtx = oEvent.getSource().getBindingContext("admin");
            var sEmployeeId = oCtx.getProperty("ID");

            var oModel = this.getOwnerComponent().getModel("admin"); // MainService
            var oOperation = oModel.bindContext("/changeEmployeeStatus(...)");
            oOperation.setParameter("employeeId", sEmployeeId);
            oOperation.setParameter("active", bNewState);

            oOperation.execute().then(function () {
                MessageToast.show("Employee status updated");
            }).catch(function (oErr) {
                console.error("[Admin] changeEmployeeStatus failed", oErr);
                // revert the switch on failure
                oEvent.getSource().setState(!bNewState);
                MessageBox.error(oErr.message || "Could not update employee status.");
            });
        },

        onClaimTypeActiveChange: function (oEvent) {
            var bNewState = oEvent.getParameter("state");
            var oCtx = oEvent.getSource().getBindingContext("admin");
            var sClaimTypeId = oCtx.getProperty("ID");

            var oModel = this.getOwnerComponent().getModel("admin");
            var oOperation = oModel.bindContext("/changeClaimTypeStatus(...)");
            oOperation.setParameter("claimTypeId", sClaimTypeId);
            oOperation.setParameter("active", bNewState);

            oOperation.execute().then(function () {
                MessageToast.show("Claim type status updated");
            }).catch(function (oErr) {
                console.error("[Admin] changeClaimTypeStatus failed", oErr);
                oEvent.getSource().setState(!bNewState);
                MessageBox.error(oErr.message || "Could not update claim type status.");
            });
        }
    });
});