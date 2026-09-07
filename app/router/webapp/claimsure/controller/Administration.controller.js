sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "claimsure/app/model/formatter"
], function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox,
    formatter
) {
    "use strict";

    return Controller.extend("claimsure.app.controller.Administration", {

        formatter: formatter,

        onInit: function () {

            this._employeeContext = null;
            this._customerContext = null;
            this._claimTypeContext = null;

            var oViewModel = new JSONModel({
                employeeDepartments: [
                    "Claims Operations",
                    "Claims Management",
                    "Investigation",
                    "Finance",
                    "Administration"
                ],

                employeeRoles: [
                    "ClaimsAgent",
                    "Investigator",
                    "ClaimsManager",
                    "FinanceOfficer",
                    "Admin"
                ],

                claimTypeCategories: [
                    "Vehicle",
                    "Health",
                    "Property"
                ]
            });

            this.getView().setModel(oViewModel, "adminOptions");
        },

        // ============================================================
        // EMPLOYEE ACTIVE / INACTIVE
        // ============================================================

        onEmployeeActiveChange: function (oEvent) {

            var bNewState = oEvent.getParameter("state");

            var oCtx = oEvent.getSource()
                .getBindingContext("admin");

            if (!oCtx) {
                MessageBox.error("Employee context not found.");
                return;
            }

            var sEmployeeId = oCtx.getProperty("ID");

            var oModel = this.getOwnerComponent()
                .getModel("admin");

            var oOperation = oModel.bindContext(
                "/changeEmployeeStatus(...)"
            );

            oOperation.setParameter(
                "employeeId",
                sEmployeeId
            );

            oOperation.setParameter(
                "active",
                bNewState
            );

            oOperation.execute()
                .then(function () {

                    MessageToast.show(
                        bNewState
                            ? "Employee activated"
                            : "Employee deactivated"
                    );

                })
                .catch(function (oErr) {

                    console.error(
                        "[Admin] Employee status error:",
                        oErr
                    );

                    oEvent.getSource()
                        .setState(!bNewState);

                    MessageBox.error(
                        oErr.message ||
                        "Could not update employee status."
                    );
                });
        },

        // ============================================================
        // CLAIM TYPE ACTIVE / INACTIVE
        // ============================================================

        onClaimTypeActiveChange: function (oEvent) {

            var bNewState = oEvent.getParameter("state");

            var oCtx = oEvent.getSource()
                .getBindingContext("admin");

            if (!oCtx) {
                MessageBox.error("Claim type context not found.");
                return;
            }

            var sClaimTypeId = oCtx.getProperty("ID");

            var oModel = this.getOwnerComponent()
                .getModel("admin");

            var oOperation = oModel.bindContext(
                "/changeClaimTypeStatus(...)"
            );

            oOperation.setParameter(
                "claimTypeId",
                sClaimTypeId
            );

            oOperation.setParameter(
                "active",
                bNewState
            );

            oOperation.execute()
                .then(function () {

                    MessageToast.show(
                        bNewState
                            ? "Claim type activated"
                            : "Claim type deactivated"
                    );

                })
                .catch(function (oErr) {

                    console.error(
                        "[Admin] Claim type status error:",
                        oErr
                    );

                    oEvent.getSource()
                        .setState(!bNewState);

                    MessageBox.error(
                        oErr.message ||
                        "Could not update claim type status."
                    );
                });
        },

        // ============================================================
        // EMPLOYEE CREATE
        // ============================================================

        onCreateEmployee: function () {

            this._employeeContext = null;

            var oDialog = this.byId("employeeDialog");

            oDialog.setTitle("New Employee");

            oDialog.setModel(
                new JSONModel({
                    employeeNumber: "",
                    firstName: "",
                    lastName: "",
                    email: "",
                    department: "",
                    role: "",
                    active: true
                }),
                "draft"
            );

            oDialog.open();
        },

        // ============================================================
        // EMPLOYEE EDIT
        // ============================================================

        onEditEmployee: function (oEvent) {

            var oContext = oEvent.getSource()
                .getBindingContext("admin");

            if (!oContext) {
                MessageBox.error("Employee context not found.");
                return;
            }

            this._employeeContext = oContext;

            var oData = oContext.getObject();

            var oDialog = this.byId("employeeDialog");

            oDialog.setTitle("Edit Employee");

            oDialog.setModel(
                new JSONModel({
                    employeeNumber: oData.employeeNumber || "",
                    firstName: oData.firstName || "",
                    lastName: oData.lastName || "",
                    email: oData.email || "",
                    department: oData.department || "",
                    role: oData.role || "",
                    active: oData.active !== false
                }),
                "draft"
            );

            oDialog.open();
        },

        // ============================================================
        // EMPLOYEE SAVE
        // ============================================================

        onSaveEmployee: function () {

            var oDialog = this.byId("employeeDialog");

            var oDraft = oDialog
                .getModel("draft")
                .getData();

            var sEmployeeNumber =
                (oDraft.employeeNumber || "").trim();

            var sFirstName =
                (oDraft.firstName || "").trim();

            var sLastName =
                (oDraft.lastName || "").trim();

            var sEmail =
                (oDraft.email || "").trim();

            var sDepartment =
                (oDraft.department || "").trim();

            var sRole =
                (oDraft.role || "").trim();

            // --------------------------------------------------------
            // REQUIRED VALIDATION
            // --------------------------------------------------------

            if (!sEmployeeNumber) {
                MessageBox.warning(
                    "Please enter Employee Number."
                );
                return;
            }

            if (!sFirstName) {
                MessageBox.warning(
                    "Please enter First Name."
                );
                return;
            }

            if (!sLastName) {
                MessageBox.warning(
                    "Please enter Last Name."
                );
                return;
            }

            if (!sEmail) {
                MessageBox.warning(
                    "Please enter Email."
                );
                return;
            }

            // --------------------------------------------------------
            // EMAIL VALIDATION
            // IMPORTANT: matches CDS pattern
            // --------------------------------------------------------

            var oEmailPattern =
                /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

            if (!oEmailPattern.test(sEmail)) {

                MessageBox.warning(
                    "Please enter a valid email address.\n\n" +
                    "Example: john@example.com"
                );

                return;
            }

            // --------------------------------------------------------
            // ROLE VALIDATION
            // --------------------------------------------------------

            var aValidRoles = [
                "ClaimsAgent",
                "Investigator",
                "ClaimsManager",
                "FinanceOfficer",
                "Admin"
            ];

            if (sRole && aValidRoles.indexOf(sRole) === -1) {

                MessageBox.warning(
                    "Please select a valid Employee Role."
                );

                return;
            }

            // --------------------------------------------------------
            // MODEL
            // --------------------------------------------------------

            var oModel = this.getOwnerComponent()
                .getModel("admin");

            if (!oModel) {

                MessageBox.error(
                    "Administration OData model is not available."
                );

                return;
            }

            // ========================================================
            // UPDATE EMPLOYEE
            // ========================================================

            if (this._employeeContext) {

                var oCtx = this._employeeContext;

                oCtx.setProperty(
                    "employeeNumber",
                    sEmployeeNumber
                );

                oCtx.setProperty(
                    "firstName",
                    sFirstName
                );

                oCtx.setProperty(
                    "lastName",
                    sLastName
                );

                oCtx.setProperty(
                    "email",
                    sEmail
                );

                oCtx.setProperty(
                    "department",
                    sDepartment
                );

                oCtx.setProperty(
                    "role",
                    sRole || null
                );

                oCtx.setProperty(
                    "active",
                    oDraft.active !== false
                );

                oModel.submitBatch("$auto")
                    .then(function () {

                        MessageToast.show(
                            "Employee updated successfully"
                        );

                        this._refreshTable(
                            "employeesTable"
                        );

                        this._employeeContext = null;

                        oDialog.close();

                    }.bind(this))
                    .catch(function (oErr) {

                        console.error(
                            "[Admin] Update employee failed:",
                            oErr
                        );

                        MessageBox.error(
                            this._getErrorMessage(oErr)
                        );

                    }.bind(this));

                return;
            }

            // ========================================================
            // CREATE EMPLOYEE
            // ========================================================

            var oListBinding =
                oModel.bindList("/Employees");

            var oCreatedContext =
                oListBinding.create({

                    employeeNumber:
                        sEmployeeNumber,

                    firstName:
                        sFirstName,

                    lastName:
                        sLastName,

                    email:
                        sEmail,

                    department:
                        sDepartment || null,

                    role:
                        sRole || null,

                    active:
                        oDraft.active !== false
                });

            oCreatedContext.created()
                .then(function () {

                    MessageToast.show(
                        "Employee created successfully"
                    );

                    this._refreshTable(
                        "employeesTable"
                    );

                    this._employeeContext = null;

                    oDialog.close();

                }.bind(this))
                .catch(function (oErr) {

                    console.error(
                        "[Admin] Create employee failed:",
                        oErr
                    );

                    MessageBox.error(
                        this._getErrorMessage(oErr)
                    );

                }.bind(this));
        },

        // ============================================================
        // EMPLOYEE CANCEL
        // ============================================================

        onCancelEmployee: function () {

            this._employeeContext = null;

            this.byId("employeeDialog").close();
        },

        // ============================================================
        // EMPLOYEE DELETE
        // ============================================================

        onDeleteEmployee: function (oEvent) {

            var oContext = oEvent.getSource()
                .getBindingContext("admin");

            if (!oContext) {
                MessageBox.error("Employee context not found.");
                return;
            }

            var oData = oContext.getObject();

            MessageBox.confirm(

                "Delete employee " +
                oData.employeeNumber +
                " (" +
                oData.firstName +
                " " +
                oData.lastName +
                ")?",

                {
                    title: "Confirm Delete",

                    actions: [
                        MessageBox.Action.OK,
                        MessageBox.Action.CANCEL
                    ],

                    emphasizedAction:
                        MessageBox.Action.OK,

                    onClose: function (sAction) {

                        if (
                            sAction !==
                            MessageBox.Action.OK
                        ) {
                            return;
                        }

                        oContext.delete()
                            .then(function () {

                                MessageToast.show(
                                    "Employee deleted"
                                );

                                this._refreshTable(
                                    "employeesTable"
                                );

                            }.bind(this))
                            .catch(function (oErr) {

                                console.error(
                                    "[Admin] Delete employee failed:",
                                    oErr
                                );

                                MessageBox.error(
                                    this._getErrorMessage(oErr)
                                );

                            }.bind(this));
                    }.bind(this)
                }
            );
        },

        // ============================================================
        // CUSTOMER CREATE
        // ============================================================

        onCreateCustomer: function () {

            this._customerContext = null;

            var oDialog =
                this.byId("customerDialog");

            oDialog.setTitle("New Customer");

            oDialog.setModel(
                new JSONModel({
                    customerNumber: "",
                    firstName: "",
                    lastName: "",
                    email: "",
                    phone: "",
                    status: "Active"
                }),
                "draft"
            );

            oDialog.open();
        },

        // ============================================================
        // CUSTOMER EDIT
        // ============================================================

        onEditCustomer: function (oEvent) {

            var oContext = oEvent.getSource()
                .getBindingContext("admin");

            if (!oContext) {
                MessageBox.error("Customer context not found.");
                return;
            }

            this._customerContext = oContext;

            var oData = oContext.getObject();

            var oDialog =
                this.byId("customerDialog");

            oDialog.setTitle("Edit Customer");

            oDialog.setModel(
                new JSONModel({

                    customerNumber:
                        oData.customerNumber || "",

                    firstName:
                        oData.firstName || "",

                    lastName:
                        oData.lastName || "",

                    email:
                        oData.email || "",

                    phone:
                        oData.phone || "",

                    status:
                        oData.status || "Active"

                }),
                "draft"
            );

            oDialog.open();
        },

        // ============================================================
        // CUSTOMER SAVE
        // ============================================================

        onSaveCustomer: function () {

            var oDialog =
                this.byId("customerDialog");

            var oDraft =
                oDialog
                    .getModel("draft")
                    .getData();

            var sCustomerNumber =
                (oDraft.customerNumber || "").trim();

            var sFirstName =
                (oDraft.firstName || "").trim();

            var sLastName =
                (oDraft.lastName || "").trim();

            var sEmail =
                (oDraft.email || "").trim();

            var sPhone =
                (oDraft.phone || "").trim();

            var sStatus =
                oDraft.status || "Active";

            if (!sCustomerNumber) {
                MessageBox.warning(
                    "Please enter Customer Number."
                );
                return;
            }

            if (!sFirstName) {
                MessageBox.warning(
                    "Please enter First Name."
                );
                return;
            }

            if (!sLastName) {
                MessageBox.warning(
                    "Please enter Last Name."
                );
                return;
            }

            if (!sEmail) {
                MessageBox.warning(
                    "Please enter Email."
                );
                return;
            }

            // Correct email validation
            var oEmailPattern =
                /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

            if (!oEmailPattern.test(sEmail)) {

                MessageBox.warning(
                    "Please enter a valid email address."
                );

                return;
            }

            var oModel =
                this.getOwnerComponent()
                    .getModel("admin");

            // ========================================================
            // UPDATE CUSTOMER
            // ========================================================

            if (this._customerContext) {

                var oCtx =
                    this._customerContext;

                oCtx.setProperty(
                    "customerNumber",
                    sCustomerNumber
                );

                oCtx.setProperty(
                    "firstName",
                    sFirstName
                );

                oCtx.setProperty(
                    "lastName",
                    sLastName
                );

                oCtx.setProperty(
                    "email",
                    sEmail
                );

                oCtx.setProperty(
                    "phone",
                    sPhone || null
                );

                oCtx.setProperty(
                    "status",
                    sStatus
                );

                oModel.submitBatch("$auto")
                    .then(function () {

                        MessageToast.show(
                            "Customer updated successfully"
                        );

                        this._refreshTable(
                            "customersTable"
                        );

                        this._customerContext = null;

                        oDialog.close();

                    }.bind(this))
                    .catch(function (oErr) {

                        console.error(
                            "[Admin] Update customer failed:",
                            oErr
                        );

                        MessageBox.error(
                            this._getErrorMessage(oErr)
                        );

                    }.bind(this));

                return;
            }

            // ========================================================
            // CREATE CUSTOMER
            // ========================================================

            var oListBinding =
                oModel.bindList("/Customers");

            var oCreatedContext =
                oListBinding.create({

                    customerNumber:
                        sCustomerNumber,

                    firstName:
                        sFirstName,

                    lastName:
                        sLastName,

                    email:
                        sEmail,

                    phone:
                        sPhone || null,

                    status:
                        sStatus
                });

            oCreatedContext.created()
                .then(function () {

                    MessageToast.show(
                        "Customer created successfully"
                    );

                    this._refreshTable(
                        "customersTable"
                    );

                    this._customerContext = null;

                    oDialog.close();

                }.bind(this))
                .catch(function (oErr) {

                    console.error(
                        "[Admin] Create customer failed:",
                        oErr
                    );

                    MessageBox.error(
                        this._getErrorMessage(oErr)
                    );

                }.bind(this));
        },

        // ============================================================
        // CUSTOMER CANCEL
        // ============================================================

        onCancelCustomer: function () {

            this._customerContext = null;

            this.byId("customerDialog").close();
        },

        // ============================================================
        // CUSTOMER DELETE
        // ============================================================

        onDeleteCustomer: function (oEvent) {

            var oContext = oEvent.getSource()
                .getBindingContext("admin");

            if (!oContext) {
                MessageBox.error("Customer context not found.");
                return;
            }

            var oData =
                oContext.getObject();

            MessageBox.confirm(

                "Delete customer " +
                oData.customerNumber +
                " (" +
                oData.firstName +
                " " +
                oData.lastName +
                ")?",

                {
                    title: "Confirm Delete",

                    actions: [
                        MessageBox.Action.OK,
                        MessageBox.Action.CANCEL
                    ],

                    emphasizedAction:
                        MessageBox.Action.OK,

                    onClose: function (sAction) {

                        if (
                            sAction !==
                            MessageBox.Action.OK
                        ) {
                            return;
                        }

                        oContext.delete()
                            .then(function () {

                                MessageToast.show(
                                    "Customer deleted"
                                );

                                this._refreshTable(
                                    "customersTable"
                                );

                            }.bind(this))
                            .catch(function (oErr) {

                                console.error(
                                    "[Admin] Delete customer failed:",
                                    oErr
                                );

                                MessageBox.error(
                                    this._getErrorMessage(oErr)
                                );

                            }.bind(this));
                    }.bind(this)
                }
            );
        },

        // ============================================================
        // CLAIM TYPE CREATE
        // ============================================================

        onCreateClaimType: function () {

            this._claimTypeContext = null;

            var oDialog =
                this.byId("claimTypeDialog");

            oDialog.setTitle("New Claim Type");

            oDialog.setModel(
                new JSONModel({
                    code: "",
                    name: "",
                    category: "",
                    active: true
                }),
                "draft"
            );

            oDialog.open();
        },

        // ============================================================
        // CLAIM TYPE EDIT
        // ============================================================

        onEditClaimType: function (oEvent) {

            var oContext =
                oEvent.getSource()
                    .getBindingContext("admin");

            if (!oContext) {
                MessageBox.error(
                    "Claim type context not found."
                );
                return;
            }

            this._claimTypeContext =
                oContext;

            var oData =
                oContext.getObject();

            var oDialog =
                this.byId("claimTypeDialog");

            oDialog.setTitle(
                "Edit Claim Type"
            );

            oDialog.setModel(
                new JSONModel({

                    code:
                        oData.code || "",

                    name:
                        oData.name || "",

                    category:
                        oData.category || "",

                    active:
                        oData.active !== false

                }),
                "draft"
            );

            oDialog.open();
        },

        // ============================================================
        // CLAIM TYPE SAVE
        // ============================================================

        onSaveClaimType: function () {

            var oDialog =
                this.byId("claimTypeDialog");

            var oDraft =
                oDialog
                    .getModel("draft")
                    .getData();

            var sCode =
                (oDraft.code || "").trim();

            var sName =
                (oDraft.name || "").trim();

            var sCategory =
                (oDraft.category || "").trim();

            if (!sCode) {

                MessageBox.warning(
                    "Please enter Claim Type Code."
                );

                return;
            }

            if (!sName) {

                MessageBox.warning(
                    "Please enter Claim Type Name."
                );

                return;
            }

            // --------------------------------------------------------
            // CATEGORY VALIDATION
            // --------------------------------------------------------

            var aValidCategories = [
                "Vehicle",
                "Health",
                "Property"
            ];

            if (
                sCategory &&
                aValidCategories.indexOf(sCategory) === -1
            ) {

                MessageBox.warning(
                    "Please select a valid Claim Type Category."
                );

                return;
            }

            var oModel =
                this.getOwnerComponent()
                    .getModel("admin");

            // ========================================================
            // UPDATE CLAIM TYPE
            // ========================================================

            if (this._claimTypeContext) {

                var oCtx =
                    this._claimTypeContext;

                oCtx.setProperty(
                    "code",
                    sCode
                );

                oCtx.setProperty(
                    "name",
                    sName
                );

                oCtx.setProperty(
                    "category",
                    sCategory || null
                );

                oCtx.setProperty(
                    "active",
                    oDraft.active !== false
                );

                oModel.submitBatch("$auto")
                    .then(function () {

                        MessageToast.show(
                            "Claim type updated successfully"
                        );

                        this._refreshTable(
                            "claimTypesTable"
                        );

                        this._claimTypeContext =
                            null;

                        oDialog.close();

                    }.bind(this))
                    .catch(function (oErr) {

                        console.error(
                            "[Admin] Update claim type failed:",
                            oErr
                        );

                        MessageBox.error(
                            this._getErrorMessage(oErr)
                        );

                    }.bind(this));

                return;
            }

            // ========================================================
            // CREATE CLAIM TYPE
            // ========================================================

            var oListBinding =
                oModel.bindList("/ClaimTypes");

            var oCreatedContext =
                oListBinding.create({

                    code:
                        sCode,

                    name:
                        sName,

                    category:
                        sCategory || null,

                    active:
                        oDraft.active !== false
                });

            oCreatedContext.created()
                .then(function () {

                    MessageToast.show(
                        "Claim type created successfully"
                    );

                    this._refreshTable(
                        "claimTypesTable"
                    );

                    this._claimTypeContext =
                        null;

                    oDialog.close();

                }.bind(this))
                .catch(function (oErr) {

                    console.error(
                        "[Admin] Create claim type failed:",
                        oErr
                    );

                    MessageBox.error(
                        this._getErrorMessage(oErr)
                    );

                }.bind(this));
        },

        // ============================================================
        // CLAIM TYPE CANCEL
        // ============================================================

        onCancelClaimType: function () {

            this._claimTypeContext = null;

            this.byId("claimTypeDialog").close();
        },

        // ============================================================
        // CLAIM TYPE DELETE
        // ============================================================

        onDeleteClaimType: function (oEvent) {

            var oContext =
                oEvent.getSource()
                    .getBindingContext("admin");

            if (!oContext) {

                MessageBox.error(
                    "Claim type context not found."
                );

                return;
            }

            var oData =
                oContext.getObject();

            MessageBox.confirm(

                "Delete claim type " +
                oData.code +
                " (" +
                oData.name +
                ")?",

                {
                    title: "Confirm Delete",

                    actions: [
                        MessageBox.Action.OK,
                        MessageBox.Action.CANCEL
                    ],

                    emphasizedAction:
                        MessageBox.Action.OK,

                    onClose: function (sAction) {

                        if (
                            sAction !==
                            MessageBox.Action.OK
                        ) {
                            return;
                        }

                        oContext.delete()
                            .then(function () {

                                MessageToast.show(
                                    "Claim type deleted"
                                );

                                this._refreshTable(
                                    "claimTypesTable"
                                );

                            }.bind(this))
                            .catch(function (oErr) {

                                console.error(
                                    "[Admin] Delete claim type failed:",
                                    oErr
                                );

                                MessageBox.error(
                                    this._getErrorMessage(oErr)
                                );

                            }.bind(this));
                    }.bind(this)
                }
            );
        },

        // ============================================================
        // COMMON TABLE REFRESH
        // ============================================================

        _refreshTable: function (sTableId) {

            var oTable =
                this.byId(sTableId);

            if (!oTable) {
                return;
            }

            var oBinding =
                oTable.getBinding("items");

            if (oBinding) {
                oBinding.refresh();
            }
        },

        // ============================================================
        // ERROR MESSAGE
        // ============================================================

        _getErrorMessage: function (oErr) {

            if (!oErr) {
                return "Unknown error occurred.";
            }

            if (oErr.message) {
                return oErr.message;
            }

            return "Operation failed.";
        }

    });
});