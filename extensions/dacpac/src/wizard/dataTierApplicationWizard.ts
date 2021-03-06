/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as azdata from 'azdata';
import * as loc from '../localizedConstants';
import { SelectOperationPage } from './pages/selectOperationpage';
import { DeployConfigPage } from './pages/deployConfigPage';
import { DeployPlanPage } from './pages/deployPlanPage';
import { DacFxSummaryPage } from './pages/dacFxSummaryPage';
import { ExportConfigPage } from './pages/exportConfigPage';
import { ExtractConfigPage } from './pages/extractConfigPage';
import { ImportConfigPage } from './pages/importConfigPage';
import { DacFxDataModel } from './api/models';
import { BasePage } from './api/basePage';
import * as mssql from '../../../mssql';

const msSqlProvider = 'MSSQL';
class Page {
	wizardPage: azdata.window.WizardPage;
	dacFxPage: BasePage;

	constructor(wizardPage: azdata.window.WizardPage) {
		this.wizardPage = wizardPage;
	}
}

export enum Operation {
	deploy,
	extract,
	import,
	export,
	generateDeployScript
}

export enum DeployOperationPath {
	selectOperation,
	deployOptions,
	deployPlan,
	summary
}

export enum DeployNewOperationPath {
	selectOperation,
	deployOptions,
	summary
}

export enum ExtractOperationPath {
	selectOperation,
	options,
	summary
}

export enum ImportOperationPath {
	selectOperation,
	options,
	summary
}

export enum ExportOperationPath {
	selectOperation,
	options,
	summary
}

export enum PageName {
	selectOperation = 'selectOperation',
	deployConfig = 'deployConfig',
	deployPlan = 'deployPlan',
	extractConfig = 'extractConfig',
	importConfig = 'importConfig',
	exportConfig = 'exportConfig',
	summary = 'summary'
}

export class DataTierApplicationWizard {
	public wizard: azdata.window.Wizard;
	private connection: azdata.connection.ConnectionProfile;
	private model: DacFxDataModel;
	public pages: Map<string, Page> = new Map<string, Page>();
	public selectedOperation: Operation;

	constructor() {
	}

	public async start(p: any, ...args: any[]) {
		this.model = <DacFxDataModel>{};

		let profile = p ? <azdata.IConnectionProfile>p.connectionProfile : undefined;
		if (profile) {
			this.model.serverId = profile.id;
			this.model.database = profile.databaseName;
		}

		this.connection = await azdata.connection.getCurrentConnection();
		if (!this.connection || (profile && this.connection.connectionId !== profile.id)) {
			// @TODO: remove cast once azdata update complete - karlb 3/1/2019
			this.connection = <azdata.connection.ConnectionProfile><any>await azdata.connection.openConnectionDialog(undefined, profile);

			// don't open the wizard if connection dialog is cancelled
			if (!this.connection) {
				return;
			}
		}

		this.model.serverId = this.connection.connectionId;

		this.wizard = azdata.window.createWizard(loc.wizardTitle);
		let selectOperationWizardPage = azdata.window.createWizardPage(loc.selectOperationPageName);
		let deployConfigWizardPage = azdata.window.createWizardPage(loc.deployConfigPageName);
		let deployPlanWizardPage = azdata.window.createWizardPage(loc.deployPlanPageName);
		let summaryWizardPage = azdata.window.createWizardPage(loc.summaryPageName);
		let extractConfigWizardPage = azdata.window.createWizardPage(loc.extractConfigPageName);
		let importConfigWizardPage = azdata.window.createWizardPage(loc.importConfigPageName);
		let exportConfigWizardPage = azdata.window.createWizardPage(loc.exportConfigPageName);

		this.pages.set(PageName.selectOperation, new Page(selectOperationWizardPage));
		this.pages.set(PageName.deployConfig, new Page(deployConfigWizardPage));
		this.pages.set(PageName.deployPlan, new Page(deployPlanWizardPage));
		this.pages.set(PageName.extractConfig, new Page(extractConfigWizardPage));
		this.pages.set(PageName.importConfig, new Page(importConfigWizardPage));
		this.pages.set(PageName.exportConfig, new Page(exportConfigWizardPage));
		this.pages.set(PageName.summary, new Page(summaryWizardPage));

		selectOperationWizardPage.registerContent(async (view) => {
			let selectOperationDacFxPage = new SelectOperationPage(this, selectOperationWizardPage, this.model, view);
			this.pages.get('selectOperation').dacFxPage = selectOperationDacFxPage;
			await selectOperationDacFxPage.start().then(() => {
				selectOperationDacFxPage.setupNavigationValidator();
				selectOperationDacFxPage.onPageEnter();
			});
		});

		deployConfigWizardPage.registerContent(async (view) => {
			let deployConfigDacFxPage = new DeployConfigPage(this, deployConfigWizardPage, this.model, view);
			this.pages.get(PageName.deployConfig).dacFxPage = deployConfigDacFxPage;
			await deployConfigDacFxPage.start();
		});

		deployPlanWizardPage.registerContent(async (view) => {
			let deployPlanDacFxPage = new DeployPlanPage(this, deployPlanWizardPage, this.model, view);
			this.pages.get(PageName.deployPlan).dacFxPage = deployPlanDacFxPage;
			await deployPlanDacFxPage.start();
		});

		extractConfigWizardPage.registerContent(async (view) => {
			let extractConfigDacFxPage = new ExtractConfigPage(this, extractConfigWizardPage, this.model, view);
			this.pages.get(PageName.extractConfig).dacFxPage = extractConfigDacFxPage;
			await extractConfigDacFxPage.start();
		});

		importConfigWizardPage.registerContent(async (view) => {
			let importConfigDacFxPage = new ImportConfigPage(this, importConfigWizardPage, this.model, view);
			this.pages.get(PageName.importConfig).dacFxPage = importConfigDacFxPage;
			await importConfigDacFxPage.start();
		});

		exportConfigWizardPage.registerContent(async (view) => {
			let exportConfigDacFxPage = new ExportConfigPage(this, exportConfigWizardPage, this.model, view);
			this.pages.get(PageName.exportConfig).dacFxPage = exportConfigDacFxPage;
			await exportConfigDacFxPage.start();
		});

		summaryWizardPage.registerContent(async (view) => {
			let summaryDacFxPage = new DacFxSummaryPage(this, summaryWizardPage, this.model, view);
			this.pages.get(PageName.summary).dacFxPage = summaryDacFxPage;
			await summaryDacFxPage.start();
		});

		this.wizard.onPageChanged(async (event) => {
			let idxLast = event.lastPage;
			let lastPage = this.getPage(idxLast);
			if (lastPage) {
				lastPage.dacFxPage.onPageLeave();
			}

			let idx = event.newPage;
			let page = this.getPage(idx);
			if (page) {
				page.dacFxPage.setupNavigationValidator();
				page.dacFxPage.onPageEnter();
			}
		});

		this.wizard.pages = [selectOperationWizardPage, deployConfigWizardPage, deployPlanWizardPage, summaryWizardPage];
		this.wizard.generateScriptButton.hidden = true;
		this.wizard.generateScriptButton.onClick(async () => await this.generateDeployScript());
		this.wizard.doneButton.onClick(async () => await this.executeOperation());

		this.wizard.open();
	}

	public registerNavigationValidator(validator: (pageChangeInfo: azdata.window.WizardPageChangeInfo) => boolean) {
		this.wizard.registerNavigationValidator(validator);
	}

	public setDoneButton(operation: Operation): void {
		switch (operation) {
			case Operation.deploy: {
				this.wizard.doneButton.label = loc.deploy;
				this.selectedOperation = Operation.deploy;
				break;
			}
			case Operation.extract: {
				this.wizard.doneButton.label = loc.extract;
				this.selectedOperation = Operation.extract;
				break;
			}
			case Operation.import: {
				this.wizard.doneButton.label = loc.importText;
				this.selectedOperation = Operation.import;
				break;
			}
			case Operation.export: {
				this.wizard.doneButton.label = loc.exportText;
				this.selectedOperation = Operation.export;
				break;
			}
			case Operation.generateDeployScript: {
				this.wizard.doneButton.label = loc.generateScript;
				this.selectedOperation = Operation.generateDeployScript;
				break;
			}
		}

		if (operation !== Operation.deploy && operation !== Operation.generateDeployScript) {
			this.model.upgradeExisting = false;
		}
	}

	private async executeOperation() {
		switch (this.selectedOperation) {
			case Operation.deploy: {
				await this.deploy();
				break;
			}
			case Operation.extract: {
				await this.extract();
				break;
			}
			case Operation.import: {
				await this.import();
				break;
			}
			case Operation.export: {
				await this.export();
				break;
			}
			case Operation.generateDeployScript: {
				await this.generateDeployScript();
				break;
			}
		}
	}

	private async deploy(): Promise<void> {
		const service = await DataTierApplicationWizard.getService(msSqlProvider);
		const ownerUri = await azdata.connection.getUriForConnection(this.model.server.connectionId);

		await service.deployDacpac(this.model.filePath, this.model.database, this.model.upgradeExisting, ownerUri, azdata.TaskExecutionMode.execute);
	}

	private async extract(): Promise<void> {
		const service = await DataTierApplicationWizard.getService(msSqlProvider);
		const ownerUri = await azdata.connection.getUriForConnection(this.model.server.connectionId);

		await service.extractDacpac(this.model.database, this.model.filePath, this.model.database, this.model.version, ownerUri, azdata.TaskExecutionMode.execute);
	}

	private async export(): Promise<void> {
		const service = await DataTierApplicationWizard.getService(msSqlProvider);
		const ownerUri = await azdata.connection.getUriForConnection(this.model.server.connectionId);

		await service.exportBacpac(this.model.database, this.model.filePath, ownerUri, azdata.TaskExecutionMode.execute);
	}

	private async import(): Promise<void> {
		const service = await DataTierApplicationWizard.getService(msSqlProvider);
		const ownerUri = await azdata.connection.getUriForConnection(this.model.server.connectionId);

		await service.importBacpac(this.model.filePath, this.model.database, ownerUri, azdata.TaskExecutionMode.execute);
	}

	private async generateDeployScript(): Promise<void> {
		const service = await DataTierApplicationWizard.getService(msSqlProvider);
		const ownerUri = await azdata.connection.getUriForConnection(this.model.server.connectionId);
		this.wizard.message = {
			text: loc.generatingScriptMessage,
			level: azdata.window.MessageLevel.Information,
			description: ''
		};

		await service.generateDeployScript(this.model.filePath, this.model.database, ownerUri, azdata.TaskExecutionMode.script);
	}

	private getPage(idx: number): Page {
		let page: Page;

		if (idx === 1) {
			switch (this.selectedOperation) {
				case Operation.deploy: {
					page = this.pages.get(PageName.deployConfig);
					break;
				}
				case Operation.extract: {
					page = this.pages.get(PageName.extractConfig);
					break;
				}
				case Operation.import: {
					page = this.pages.get(PageName.importConfig);
					break;
				}
				case Operation.export: {
					page = this.pages.get(PageName.exportConfig);
					break;
				}
			}
		} else if (this.isSummaryPage(idx)) {
			page = this.pages.get(PageName.summary);
		} else if ((this.selectedOperation === Operation.deploy || this.selectedOperation === Operation.generateDeployScript) && idx === DeployOperationPath.deployPlan) {
			page = this.pages.get(PageName.deployPlan);
		}

		return page;
	}

	private isSummaryPage(idx: number): boolean {
		return this.selectedOperation === Operation.import && idx === ImportOperationPath.summary
			|| this.selectedOperation === Operation.export && idx === ExportOperationPath.summary
			|| this.selectedOperation === Operation.extract && idx === ExtractOperationPath.summary
			|| this.selectedOperation === Operation.deploy && !this.model.upgradeExisting && idx === DeployNewOperationPath.summary
			|| (this.selectedOperation === Operation.deploy || this.selectedOperation === Operation.generateDeployScript) && idx === DeployOperationPath.summary;
	}

	public async generateDeployPlan(): Promise<string> {
		const service = await DataTierApplicationWizard.getService(msSqlProvider);
		const ownerUri = await azdata.connection.getUriForConnection(this.model.server.connectionId);

		const result = await service.generateDeployPlan(this.model.filePath, this.model.database, ownerUri, azdata.TaskExecutionMode.execute);

		if (!result || !result.success) {
			vscode.window.showErrorMessage(loc.deployPlanErrorMessage(result.errorMessage));
		}

		return result.report;
	}

	private static async getService(providerName: string): Promise<mssql.IDacFxService> {
		const service = (vscode.extensions.getExtension(mssql.extension.name).exports as mssql.IExtension).dacFx;
		return service;
	}
}
