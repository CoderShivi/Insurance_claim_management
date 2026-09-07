
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "claimsure/app/model/formatter"
], function (
    Controller,
    JSONModel,
    Filter,
    FilterOperator,
    MessageBox,
    formatter
) {
    "use strict";

    return Controller.extend(
        "claimsure.app.controller.ClaimDetail",
        {

            formatter: formatter,

            onInit: function () {

                this.getView().setModel(
                    new JSONModel({
                        busy: false,
                        fraudRiskScores: [],
                        documents: []
                    }),
                    "claimDetail"
                );

                var oRouter =
                    this.getOwnerComponent().getRouter();

                oRouter
                    .getRoute("claimDetail")
                    .attachPatternMatched(
                        this._onRouteMatched,
                        this
                    );
            },


            _onRouteMatched: function (oEvent) {

                this._sClaimId =
                    oEvent.getParameter(
                        "arguments"
                    ).claimId;

                if (!this._sClaimId) {
                    MessageBox.error(
                        "Claim ID is missing."
                    );
                    return;
                }

                this._loadClaim();
            },


            _loadClaim: function () {

                var oModel =
                    this.getOwnerComponent()
                        .getModel();

                var oDetailModel =
                    this.getView()
                        .getModel("claimDetail");

                if (!oModel) {

                    MessageBox.error(
                        "Insurance service model is not available."
                    );

                    return;
                }

                oDetailModel.setProperty(
                    "/busy",
                    true
                );

                var oBinding =
                    oModel.bindContext(
                        "/Claims(ID=" +
                        this._sClaimId +
                        ")",
                        undefined,
                        {
                            $expand:
                                "policy,documents"
                        }
                    );

                oBinding
                    .requestObject()

                    .then(function (oData) {

                        oDetailModel.setData(
                            Object.assign(
                                {
                                    fraudRiskScores: [],
                                    documents: []
                                },
                                oData
                            )
                        );

                        oDetailModel.setProperty(
                            "/busy",
                            false
                        );

                        this._loadFraudRiskScores();

                    }.bind(this))

                    .catch(function (oError) {

                        console.error(
                            "[ClaimDetail] Failed to load claim:",
                            oError
                        );

                        oDetailModel.setProperty(
                            "/busy",
                            false
                        );

                        MessageBox.error(
                            "Could not load claim details."
                        );

                    }.bind(this));
            },


            _loadFraudRiskScores: function () {

                var oInvestigationModel =
                    this.getOwnerComponent()
                        .getModel("investigation");

                var oDetailModel =
                    this.getView()
                        .getModel("claimDetail");

                if (!oInvestigationModel) {

                    console.warn(
                        "[ClaimDetail] Investigation model not found."
                    );

                    oDetailModel.setProperty(
                        "/fraudRiskScores",
                        []
                    );

                    return;
                }

                var oBinding =
                    oInvestigationModel.bindList(
                        "/FraudRiskScores",
                        undefined,
                        undefined,

                        new Filter(
                            "claim_ID",
                            FilterOperator.EQ,
                            this._sClaimId
                        ),

                        {
                            $select:
                                "ID,riskScore,riskLevel",

                            $$operationMode:
                                "Server"
                        }
                    );

                oBinding
                    .requestContexts(0, 100)

                    .then(function (aContexts) {

                        var aScores =
                            aContexts.map(
                                function (oContext) {
                                    return oContext.getObject();
                                }
                            );

                        oDetailModel.setProperty(
                            "/fraudRiskScores",
                            aScores
                        );

                    })

                    .catch(function (oError) {

                        console.warn(
                            "[ClaimDetail] Failed to load fraud risk scores:",
                            oError
                        );

                        oDetailModel.setProperty(
                            "/fraudRiskScores",
                            []
                        );
                    });
            },


            onNavBack: function () {

                this.getOwnerComponent()
                    .getRouter()
                    .navTo("claims");
            }

        }
    );
});

