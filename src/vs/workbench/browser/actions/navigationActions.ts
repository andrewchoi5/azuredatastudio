/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Registry } from 'vs/platform/registry/common/platform';
import { Action } from 'vs/base/common/actions';
import { IEditorGroupsService, GroupDirection, GroupLocation, IFindGroupScope } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IPanelService } from 'vs/workbench/services/panel/common/panelService';
import { IWorkbenchLayoutService, Parts } from 'vs/workbench/services/layout/browser/layoutService';
import { IViewletService } from 'vs/workbench/services/viewlet/browser/viewlet';
import { IViewlet } from 'vs/workbench/common/viewlet';
import { IPanel } from 'vs/workbench/common/panel';
import { SyncActionDescriptor } from 'vs/platform/actions/common/actions';
import { IWorkbenchActionRegistry, Extensions } from 'vs/workbench/common/actions';
import { Direction } from 'vs/base/browser/ui/grid/grid';

abstract class BaseNavigationAction extends Action {

	constructor(
		id: string,
		label: string,
		protected direction: Direction,
		@IEditorGroupsService protected editorGroupService: IEditorGroupsService,
		@IPanelService protected panelService: IPanelService,
		@IWorkbenchLayoutService protected layoutService: IWorkbenchLayoutService,
		@IViewletService protected viewletService: IViewletService
	) {
		super(id, label);
	}

	run(): Promise<any> {
		const isEditorFocus = this.layoutService.hasFocus(Parts.EDITOR_PART);
		const isPanelFocus = this.layoutService.hasFocus(Parts.PANEL_PART);
		const isSidebarFocus = this.layoutService.hasFocus(Parts.SIDEBAR_PART);

		let neighborPart: Parts | undefined;
		if (isEditorFocus) {
			const didNavigate = this.navigateAcrossEditorGroup(this.toGroupDirection(this.direction));
			if (didNavigate) {
				return Promise.resolve(true);
			}

			neighborPart = this.layoutService.getVisibleNeighborPart(Parts.EDITOR_PART, this.direction);
		}

		if (isPanelFocus) {
			neighborPart = this.layoutService.getVisibleNeighborPart(Parts.PANEL_PART, this.direction);
		}

		if (isSidebarFocus) {
			neighborPart = this.layoutService.getVisibleNeighborPart(Parts.SIDEBAR_PART, this.direction);
		}

		if (neighborPart === Parts.EDITOR_PART) {
			return Promise.resolve(this.navigateToEditorGroup(this.direction === Direction.Right ? GroupLocation.FIRST : GroupLocation.LAST));
		}

		if (neighborPart === Parts.SIDEBAR_PART) {
			return this.navigateToSidebar();
		}

		if (neighborPart === Parts.PANEL_PART) {
			return this.navigateToPanel();
		}

		return Promise.resolve(false);
	}

	private async navigateToPanel(): Promise<IPanel | boolean> {
		if (!this.layoutService.isVisible(Parts.PANEL_PART)) {
			return false;
		}

		const activePanel = this.panelService.getActivePanel();
		if (!activePanel) {
			return false;
		}

		const activePanelId = activePanel.getId();

		const res = await this.panelService.openPanel(activePanelId, true);
		if (!res) {
			return false;
		}

		return res;
	}

	private async navigateToSidebar(): Promise<IViewlet | boolean> {
		if (!this.layoutService.isVisible(Parts.SIDEBAR_PART)) {
			return Promise.resolve(false);
		}

		const activeViewlet = this.viewletService.getActiveViewlet();
		if (!activeViewlet) {
			return Promise.resolve(false);
		}
		const activeViewletId = activeViewlet.getId();

		const viewlet = await this.viewletService.openViewlet(activeViewletId, true);
		return !!viewlet;
	}

	private navigateAcrossEditorGroup(direction: GroupDirection): boolean {
		return this.doNavigateToEditorGroup({ direction });
	}

	private navigateToEditorGroup(location: GroupLocation): boolean {
		return this.doNavigateToEditorGroup({ location });
	}

	private toGroupDirection(direction: Direction): GroupDirection {
		switch (direction) {
			case Direction.Down: return GroupDirection.DOWN;
			case Direction.Left: return GroupDirection.LEFT;
			case Direction.Right: return GroupDirection.RIGHT;
			case Direction.Up: return GroupDirection.UP;
		}
	}

	private doNavigateToEditorGroup(scope: IFindGroupScope): boolean {
		const targetGroup = this.editorGroupService.findGroup(scope, this.editorGroupService.activeGroup);
		if (targetGroup) {
			targetGroup.focus();

			return true;
		}

		return false;
	}
}

class NavigateLeftAction extends BaseNavigationAction {

	static readonly ID = 'workbench.action.navigateLeft';
	static readonly LABEL = nls.localize('navigateLeft', "Navigate to the View on the Left");

	constructor(
		id: string,
		label: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IPanelService panelService: IPanelService,
		@IWorkbenchLayoutService layoutService: IWorkbenchLayoutService,
		@IViewletService viewletService: IViewletService
	) {
		super(id, label, Direction.Left, editorGroupService, panelService, layoutService, viewletService);
	}
}

class NavigateRightAction extends BaseNavigationAction {

	static readonly ID = 'workbench.action.navigateRight';
	static readonly LABEL = nls.localize('navigateRight', "Navigate to the View on the Right");

	constructor(
		id: string,
		label: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IPanelService panelService: IPanelService,
		@IWorkbenchLayoutService layoutService: IWorkbenchLayoutService,
		@IViewletService viewletService: IViewletService
	) {
		super(id, label, Direction.Right, editorGroupService, panelService, layoutService, viewletService);
	}
}

class NavigateUpAction extends BaseNavigationAction {

	static readonly ID = 'workbench.action.navigateUp';
	static readonly LABEL = nls.localize('navigateUp', "Navigate to the View Above");

	constructor(
		id: string,
		label: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IPanelService panelService: IPanelService,
		@IWorkbenchLayoutService layoutService: IWorkbenchLayoutService,
		@IViewletService viewletService: IViewletService
	) {
		super(id, label, Direction.Up, editorGroupService, panelService, layoutService, viewletService);
	}
}

class NavigateDownAction extends BaseNavigationAction {

	static readonly ID = 'workbench.action.navigateDown';
	static readonly LABEL = nls.localize('navigateDown', "Navigate to the View Below");

	constructor(
		id: string,
		label: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IPanelService panelService: IPanelService,
		@IWorkbenchLayoutService layoutService: IWorkbenchLayoutService,
		@IViewletService viewletService: IViewletService
	) {
		super(id, label, Direction.Down, editorGroupService, panelService, layoutService, viewletService);
	}
}

const registry = Registry.as<IWorkbenchActionRegistry>(Extensions.WorkbenchActions);
const viewCategory = nls.localize('view', "View");

registry.registerWorkbenchAction(SyncActionDescriptor.create(NavigateUpAction, NavigateUpAction.ID, NavigateUpAction.LABEL, undefined), 'View: Navigate to the View Above', viewCategory);
registry.registerWorkbenchAction(SyncActionDescriptor.create(NavigateDownAction, NavigateDownAction.ID, NavigateDownAction.LABEL, undefined), 'View: Navigate to the View Below', viewCategory);
registry.registerWorkbenchAction(SyncActionDescriptor.create(NavigateLeftAction, NavigateLeftAction.ID, NavigateLeftAction.LABEL, undefined), 'View: Navigate to the View on the Left', viewCategory);
registry.registerWorkbenchAction(SyncActionDescriptor.create(NavigateRightAction, NavigateRightAction.ID, NavigateRightAction.LABEL, undefined), 'View: Navigate to the View on the Right', viewCategory);
