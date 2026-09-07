sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "claimsure/app/model/formatter"
], function (Controller, JSONModel, MessageToast, MessageBox, formatter) {
    "use strict";

    return Controller.extend("claimsure.app.controller.Administration", {
        formatter: formatter,

        // ---------------------------------------------------------------
        // Toggle switches (existing quick-actions, unrelated to CRUD)
        // ---------------------------------------------------------------
        onEmployeeActiveChange: function (oEvent) {
            var bNewState = oEvent.getParameter("state");
            var oCtx = oEvent.getSource().getBindingContext("admin");
            var sEmployeeId = oCtx.getProperty("ID");

            var oModel = this.getOwnerComponent().getModel("admin");
            var oOperation = oModel.bindContext("/changeEmployeeStatus(...)");
            oOperation.setParameter("employeeId", sEmployeeId);
            oOperation.setParameter("active", bNewState);

            oOperation.execute().then(function () {
                MessageToast.show("Employee status updated");
            }).catch(function (oErr) {
                console.error("[Admin] changeEmployeeStatus failed", oErr);
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
        },

        // =================================================================
        // EMPLOYEE — Create / Edit / Delete
        // =================================================================
        onCreateEmployee: function () {
            this._employeeContext = null; // null = create mode
            var oDialog = this.byId("employeeDialog");
            oDialog.setTitle("New Employee");
            oDialog.setModel(new JSONModel({
                employeeNumber: "", firstName: "", lastName: "",
                email: "", department: "", role: "", active: true
            }), "draft");
            oDialog.open();
        },

        onEditEmployee: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("admin");
            this._employeeContext = oContext; // set = edit mode

            var oData = oContext.getObject();
            var oDialog = this.byId("employeeDialog");
            oDialog.setTitle("Edit Employee");
            oDialog.setModel(new JSONModel({
                employeeNumber: oData.employeeNumber,
                firstName: oData.firstName,
                lastName: oData.lastName,
                email: oData.email,
                department: oData.department,
                role: oData.role,
                active: oData.active
            }), "draft");
            oDialog.open();
        },

        onSaveEmployee: function () {
            var oDialog = this.byId("employeeDialog");
            var oDraft = oDialog.getModel("draft").getData();

            if (!oDraft.employeeNumber || !oDraft.firstName || !oDraft.lastName || !oDraft.email) {
                MessageBox.warning("Please fill in Employee Number, First Name, Last Name and Email.");
                return;
            }

            var oModel = this.getOwnerComponent().getModel("admin");

            if (this._employeeContext) {
                // ---- UPDATE ----
                var oCtx = this._employeeContext;
                oCtx.setProperty("employeeNumber", oDraft.employeeNumber);
                oCtx.setProperty("firstName", oDraft.firstName);
                oCtx.setProperty("lastName", oDraft.lastName);
                oCtx.setProperty("email", oDraft.email);
                oCtx.setProperty("department", oDraft.department);
                oCtx.setProperty("role", oDraft.role);
                oCtx.setProperty("active", !!oDraft.active);

                oModel.submitBatch("$auto")
                    .then(function () {
                        MessageToast.show("Employee updated");
                        oDialog.close();
                    })
                    .catch(function (oErr) {
                        console.error("[Admin] Update employee failed", oErr);
                        MessageBox.error(oErr.message || "Could not update employee.");
                    });
            } else {
                // ---- CREATE ----
                var oListBinding = oModel.bindList("/Employees");
                oListBinding.create({
                    employeeNumber: oDraft.employeeNumber,
                    firstName: oDraft.firstName,
                    lastName: oDraft.lastName,
                    email: oDraft.email,
                    department: oDraft.department,
                    role: oDraft.role,
                    active: !!oDraft.active
                });

                oModel.submitBatch("$auto")
                    .then(function () {
                        MessageToast.show("Employee created");
                        oDialog.close();
                    })
                    .catch(function (oErr) {
                        console.error("[Admin] Create employee failed", oErr);
                        MessageBox.error(oErr.message || "Could not create employee.");
                    });
            }
        },

        onCancelEmployee: function () {
            this._employeeContext = null;
            this.byId("employeeDialog").close();
        },

        onDeleteEmployee: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("admin");
            var oData = oContext.getObject();

            MessageBox.confirm(
                "Delete employee " + oData.employeeNumber + " (" + oData.firstName + " " + oData.lastName + ")?",
                {
                    title: "Confirm Delete",
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            oContext.delete().then(function () {
                                MessageToast.show("Employee deleted");
                            }).catch(function (oErr) {
                                console.error("[Admin] Delete employee failed", oErr);
                                MessageBox.error(oErr.message || "Could not delete employee.");
                            });
                        }
                    }
                }
            );
        },

        // =================================================================
        // CUSTOMER — Create / Edit / Delete
        // =================================================================
        onCreateCustomer: function () {
            this._customerContext = null;
            var oDialog = this.byId("customerDialog");
            oDialog.setTitle("New Customer");
            oDialog.setModel(new JSONModel({
                customerNumber: "", firstName: "", lastName: "",
                email: "", phone: "", status: "Active"
            }), "draft");
            oDialog.open();
        },

        onEditCustomer: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("admin");
            this._customerContext = oContext;

            var oData = oContext.getObject();
            var oDialog = this.byId("customerDialog");
            oDialog.setTitle("Edit Customer");
            oDialog.setModel(new JSONModel({
                customerNumber: oData.customerNumber,
                firstName: oData.firstName,
                lastName: oData.lastName,
                email: oData.email,
                phone: oData.phone,
                status: oData.status
            }), "draft");
            oDialog.open();
        },

        onSaveCustomer: function () {
            var oDialog = this.byId("customerDialog");
            var oDraft = oDialog.getModel("draft").getData();

            if (!oDraft.customerNumber || !oDraft.firstName || !oDraft.lastName || !oDraft.email) {
                MessageBox.warning("Please fill in Customer Number, First Name, Last Name and Email.");
                return;
            }

            var oModel = this.getOwnerComponent().getModel("admin");

            if (this._customerContext) {
                // ---- UPDATE ----
                var oCtx = this._customerContext;
                oCtx.setProperty("customerNumber", oDraft.customerNumber);
                oCtx.setProperty("firstName", oDraft.firstName);
                oCtx.setProperty("lastName", oDraft.lastName);
                oCtx.setProperty("email", oDraft.email);
                oCtx.setProperty("phone", oDraft.phone);
                oCtx.setProperty("status", oDraft.status || "Active");

                oModel.submitBatch("$auto")
                    .then(function () {
                        MessageToast.show("Customer updated");
                        oDialog.close();
                    })
                    .catch(function (oErr) {
                        console.error("[Admin] Update customer failed", oErr);
                        MessageBox.error(oErr.message || "Could not update customer.");
                    });
            } else {
                // ---- CREATE ----
                var oListBinding = oModel.bindList("/Customers");
                oListBinding.create({
                    customerNumber: oDraft.customerNumber,
                    firstName: oDraft.firstName,
                    lastName: oDraft.lastName,
                    email: oDraft.email,
                    phone: oDraft.phone,
                    status: oDraft.status || "Active"
                });

                oModel.submitBatch("$auto")
                    .then(function () {
                        MessageToast.show("Customer created");
                        oDialog.close();
                    })
                    .catch(function (oErr) {
                        console.error("[Admin] Create customer failed", oErr);
                        MessageBox.error(oErr.message || "Could not create customer.");
                    });
            }
        },

        onCancelCustomer: function () {
            this._customerContext = null;
            this.byId("customerDialog").close();
        },

        onDeleteCustomer: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("admin");
            var oData = oContext.getObject();

            MessageBox.confirm(
                "Delete customer " + oData.customerNumber + " (" + oData.firstName + " " + oData.lastName + ")?",
                {
                    title: "Confirm Delete",
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            oContext.delete().then(function () {
                                MessageToast.show("Customer deleted");
                            }).catch(function (oErr) {
                                console.error("[Admin] Delete customer failed", oErr);
                                MessageBox.error(oErr.message || "Could not delete customer.");
                            });
                        }
                    }
                }
            );
        },

        // =================================================================
        // CLAIM TYPE — Create / Edit / Delete
        // =================================================================
        onCreateClaimType: function () {
            this._claimTypeContext = null;
            var oDialog = this.byId("claimTypeDialog");
            oDialog.setTitle("New Claim Type");
            oDialog.setModel(new JSONModel({
                code: "", name: "", category: "", active: true
            }), "draft");
            oDialog.open();
        },

        onEditClaimType: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("admin");
            this._claimTypeContext = oContext;

            var oData = oContext.getObject();
            var oDialog = this.byId("claimTypeDialog");
            oDialog.setTitle("Edit Claim Type");
            oDialog.setModel(new JSONModel({
                code: oData.code,
                name: oData.name,
                category: oData.category,
                active: oData.active
            }), "draft");
            oDialog.open();
        },

        onSaveClaimType: function () {
            var oDialog = this.byId("claimTypeDialog");
            var oDraft = oDialog.getModel("draft").getData();

            if (!oDraft.code || !oDraft.name) {
                MessageBox.warning("Please fill in Code and Name.");
                return;
            }

            var oModel = this.getOwnerComponent().getModel("admin");

            if (this._claimTypeContext) {
                // ---- UPDATE ----
                var oCtx = this._claimTypeContext;
                oCtx.setProperty("code", oDraft.code);
                oCtx.setProperty("name", oDraft.name);
                oCtx.setProperty("category", oDraft.category);
                oCtx.setProperty("active", !!oDraft.active);

                oModel.submitBatch("$auto")
                    .then(function () {
                        MessageToast.show("Claim type updated");
                        oDialog.close();
                    })
                    .catch(function (oErr) {
                        console.error("[Admin] Update claim type failed", oErr);
                        MessageBox.error(oErr.message || "Could not update claim type.");
                    });
            } else {
                // ---- CREATE ----
                var oListBinding = oModel.bindList("/ClaimTypes");
                oListBinding.create({
                    code: oDraft.code,
                    name: oDraft.name,
                    category: oDraft.category,
                    active: !!oDraft.active
                });

                oModel.submitBatch("$auto")
                    .then(function () {
                        MessageToast.show("Claim type created");
                        oDialog.close();
                    })
                    .catch(function (oErr) {
                        console.error("[Admin] Create claim type failed", oErr);
                        MessageBox.error(oErr.message || "Could not create claim type.");
                    });
            }
        },

        onCancelClaimType: function () {
            this._claimTypeContext = null;
            this.byId("claimTypeDialog").close();
        },

        onDeleteClaimType: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("admin");
            var oData = oContext.getObject();

            MessageBox.confirm(
                "Delete claim type " + oData.code + " (" + oData.name + ")?",
                {
                    title: "Confirm Delete",
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            oContext.delete().then(function () {
                                MessageToast.show("Claim type deleted");
                            }).catch(function (oErr) {
                                console.error("[Admin] Delete claim type failed", oErr);
                                MessageBox.error(oErr.message || "Could not delete claim type.");
                            });
                        }
                    }
                }
            );
        }
    });
});