import {
    NgModule, Component, ElementRef, AfterContentInit, AfterViewInit, AfterViewChecked, OnInit, OnDestroy, Input,
    ViewContainerRef, ViewChild, IterableDiffers,
    Output, EventEmitter, ContentChild, ContentChildren, Renderer2, QueryList, TemplateRef, SimpleChanges,
    ChangeDetectorRef, Inject, forwardRef, EmbeddedViewRef, NgZone
} from '@angular/core';
//import {TreeTable} from '../../../components/treetable/treetable';
import { TreeNode } from '../../../components/common/treenode';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'
import { SharedModule } from '../../../components/common/shared';
//import { PaginatorModule } from '../../../components/paginator/paginator';
import { Column, Header, Footer, HeaderColumnGroup, FooterColumnGroup, PrimeTemplate } from '../../../components/common/shared';
import { LazyLoadEvent } from '../../../components/common/lazyloadevent';
import { FilterMetadata } from '../../../components/common/filtermetadata';
import { SortMeta } from '../../../components/common/sortmeta';
import { DomHandler } from '../../../components/dom/domhandler';
import { ObjectUtils } from '../../../components/utils/objectutils';
import { Subscription } from 'rxjs/Subscription';
import { BlockableUI } from '../../../components/common/blockableui';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Component({
    selector: 'ext-treeTable',
    template: `
        <div [ngClass]="'ui-treetable ui-widget'" [ngStyle]="style" [class]="styleClass">
            <div class="ui-treetable-header ui-widget-header" *ngIf="header">
                <ng-content select="p-header"></ng-content>
            </div>
            <div class="ui-treetable-tablewrapper">
                <table #tbl class="ui-widget-content" [class]="tableStyleClass" [ngStyle]="tableStyle">
                    <thead class="ui-treetable-thead">
                        <tr class="ui-state-default"  *ngIf="!headerTreeTableColumnGroups.first" class="ui-state-default" [treetable-ext-headers]="columns">
                            <th #headerCell *ngFor="let col of columns; let lastCol=last "  [ngStyle]="col.headerStyle||col.style" [class]="col.headerStyleClass||col.styleClass" 
                                [ngClass]="'ui-state-default ui-unselectable-text'">
                                <span class="ui-column-title" *ngIf="!col.headerTemplate">{{col.header}}</span>
                                <span class="ui-column-title" *ngIf="col.headerTemplate">
                                    <p-columnHeaderTemplateLoader [column]="col"></p-columnHeaderTemplateLoader>
                                </span>
                            </th>
                        </tr>
                    </thead>
                    <tfoot *ngIf="hasFooter()">
                        <tr>
                            <td *ngFor="let col of columns" [ngStyle]="col.footerStyle||col.style" [class]="col.footerStyleClass||col.styleClass" [ngClass]="{'ui-state-default':true}">
                                <span class="ui-column-footer" *ngIf="!col.footerTemplate">{{col.footer}}</span>
                                <span class="ui-column-footer" *ngIf="col.footerTemplate">
                                    <p-columnFooterTemplateLoader [column]="col"></p-columnFooterTemplateLoader>
                                </span>
                            </td>
                        </tr>
                    </tfoot>
                    <tbody extTreeRow *ngFor="let node of value;" class="ui-treetable-data ui-widget-content" [node]="node" [level]="0" [labelExpand]="labelExpand" [labelCollapse]="labelCollapse"></tbody>
                </table>
            </div>
            <div class="ui-treetable-footer ui-widget-header" *ngIf="footer">
                <ng-content select="p-footer"></ng-content>
            </div>
        </div>
    `,
    styles: ['./treetabledemocomponent.css'],
    providers: [DomHandler]
})
export class TreeExTable implements AfterContentInit {

    @Input() value: TreeNode[];

    @Input() selectionMode: string;

    @Input() selection: any;

    @Input() style: any;

    @Input() styleClass: string;

    @Input() labelExpand: string = "Expand";

    @Input() labelCollapse: string = "Collapse";

    @Input() metaKeySelection: boolean = true;

    @Input() contextMenu: any;

    @Input() toggleColumnIndex: number = 0;

    @Input() tableStyle: any;

    @Input() tableStyleClass: string;

    @Input() collapsedIcon: string = "fa-caret-right";

    @Input() expandedIcon: string = "fa-caret-down";

    @Output() onRowDblclick: EventEmitter<any> = new EventEmitter();

    @Output() selectionChange: EventEmitter<any> = new EventEmitter();

    @Output() onNodeSelect: EventEmitter<any> = new EventEmitter();

    @Output() onNodeUnselect: EventEmitter<any> = new EventEmitter();

    @Output() onNodeExpand: EventEmitter<any> = new EventEmitter();

    @Output() onNodeCollapse: EventEmitter<any> = new EventEmitter();

    @Output() onContextMenuSelect: EventEmitter<any> = new EventEmitter();

    @ContentChild(Header) header: Header;

    @ContentChild(Footer) footer: Footer;

    @ContentChildren(Column) cols: QueryList<Column>;

    @ViewChild('tbl') tableViewChild: ElementRef;

    @ContentChildren(HeaderColumnGroup) headerTreeTableColumnGroups: QueryList<HeaderColumnGroup>;

    @Output() valueChange: EventEmitter<any[]> = new EventEmitter<any[]>();

    public rowTouched: boolean;

    public columns: Column[];

    public _value: any[];

    columnsSubscription: Subscription;

    //added from datatable
    @Input() immutable: boolean = true;

    @Input() sortMode: string = 'single';

    @Input() public filters: { [s: string]: FilterMetadata; } = {};

    @Output() onSort: EventEmitter<any> = new EventEmitter();

    @Input() defaultSortOrder: number = 1;

    @Input() get sortField(): string {
        return this._sortField;
    }

    set sortField(val: string) {
        this._sortField = val;
        if (this.sortMode === 'single') {
            this.sortSingle();
        }
    }

    @Input() get sortOrder(): number {
        return this._sortOrder;
    }
    set sortOrder(val: number) {
        this._sortOrder = val;
        if (this.sortMode === 'single') {
            this.sortSingle();
        }
    }

    globalFilterFunction: any;

    @Input() get multiSortMeta(): SortMeta[] {
        return this._multiSortMeta;
    }

    set multiSortMeta(val: SortMeta[]) {
        this._multiSortMeta = val;
        if (this.sortMode === 'multiple') {
            this.sortMultiple();
        }
    }

    public preventSortPropagation: boolean;

    public filterTimeout: any;

    _multiSortMeta: SortMeta[];

    _sortField: string;

    _sortOrder: number = 1;

    public sortColumn: Column;

    public objectUtils: ObjectUtils;

    public dataToRender: any[];

    public filteredValue: any[];

    @Input() rowGroupMode: string;

    @Input() rows: number;

    public rowGroupMetadata: any;

    public _first: number = 0;

    @Input() reorderableColumns: boolean;

    @Input() globalFilter: any;

    @Output() onLazyLoad: EventEmitter<any> = new EventEmitter();

    @Output() onPage: EventEmitter<any> = new EventEmitter();

    @Input() lazy: boolean;

    @Output() onFilter: EventEmitter<any> = new EventEmitter();

    @Input() virtualScroll: boolean;

    initialized: boolean;

    @Input() filterDelay: number = 300;

    constructor(public el: ElementRef, public domHandler: DomHandler, public changeDetector: ChangeDetectorRef, public renderer: Renderer2) { }

    ngAfterContentInit() {
        this.initColumns();
        console.log("value inside afterContentInit" + this.value);
        this.columnsSubscription = this.cols.changes.subscribe(_ => {
            this.initColumns();
            this.changeDetector.markForCheck();
        });
    }

    ngOnInit() {
        if (this.immutable) this.handleDataChange();
    }

    ngAfterViewInit() {
        if (this.globalFilter && this.value) {
            this.globalFilterFunction = this.renderer.listen(this.globalFilter, 'keyup', () => {
                this.filterTimeout = setTimeout(() => {
                    this.filter();
                    this.filterTimeout = null;
                }, this.filterDelay);
            });
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['value'] && this.value && !this.immutable) {
            this.handleDataChange();
        }
    }

    ngOnDestroy() {
        //remove event listener
        if (this.globalFilterFunction) {
            this.globalFilterFunction();
        }
    }

    initColumns(): void {
        this.columns = this.cols.toArray();
    }

    getTableValue() {
        console.log("this.value insde getTableValue 1" + this.value);
        if (this.value !== undefined) {
            console.log("this.value insde getTableValue 2" + this.value);
            return this.value;
        }

    }

    onRowClick(event: MouseEvent, node: TreeNode) {
        let eventTarget = (<Element>event.target);
        if (eventTarget.className && eventTarget.className.indexOf('ui-treetable-toggler') === 0) {
            return;
        }
        else if (this.selectionMode) {
            if (node.selectable === false) {
                return;
            }

            let metaSelection = this.rowTouched ? false : this.metaKeySelection;
            let index = this.findIndexInSelection(node);
            let selected = (index >= 0);

            if (this.isCheckboxSelectionMode()) {
                if (selected) {
                    this.propagateSelectionDown(node, false);
                    if (node.parent) {
                        this.propagateSelectionUp(node.parent, false);
                    }
                    this.selectionChange.emit(this.selection);
                    this.onNodeUnselect.emit({ originalEvent: event, node: node });
                }
                else {
                    this.propagateSelectionDown(node, true);
                    if (node.parent) {
                        this.propagateSelectionUp(node.parent, true);
                    }
                    this.selectionChange.emit(this.selection);
                    this.onNodeSelect.emit({ originalEvent: event, node: node });
                }
            }
            else {
                if (metaSelection) {
                    let metaKey = (event.metaKey || event.ctrlKey);

                    if (selected && metaKey) {
                        if (this.isSingleSelectionMode()) {
                            this.selectionChange.emit(null);
                        }
                        else {
                            this.selection = this.selection.filter((val, i) => i != index);
                            this.selectionChange.emit(this.selection);
                        }

                        this.onNodeUnselect.emit({ originalEvent: event, node: node });
                    }
                    else {
                        if (this.isSingleSelectionMode()) {
                            this.selectionChange.emit(node);
                        }
                        else if (this.isMultipleSelectionMode()) {
                            this.selection = (!metaKey) ? [] : this.selection || [];
                            this.selection = [...this.selection, node];
                            this.selectionChange.emit(this.selection);
                        }

                        this.onNodeSelect.emit({ originalEvent: event, node: node });
                    }
                }
                else {
                    if (this.isSingleSelectionMode()) {
                        if (selected) {
                            this.selection = null;
                            this.onNodeUnselect.emit({ originalEvent: event, node: node });
                        }
                        else {
                            this.selection = node;
                            this.onNodeSelect.emit({ originalEvent: event, node: node });
                        }
                    }
                    else {
                        if (selected) {
                            this.selection = this.selection.filter((val, i) => i != index);
                            this.onNodeUnselect.emit({ originalEvent: event, node: node });
                        }
                        else {
                            this.selection = [...this.selection || [], node];
                            this.onNodeSelect.emit({ originalEvent: event, node: node });
                        }
                    }

                    this.selectionChange.emit(this.selection);
                }
            }
        }

        this.rowTouched = false;
    }

    onFilterInputClick(event) {
        event.stopPropagation();
    }

    filter() {
        this.first = 0;

        this.filteredValue = this.value.filter(val => {
            return this.filterFields(val.data) || this.filterChildren(val.children, val);
        });

        this.updateDataToRender(this.filteredValue || this.value);
    }

    filterFields(object) {
        let res = false;
        this.columns.map(col => {
            if (!res && object[col.field]) {
                res = object[col.field].toString().toLowerCase().includes(this.globalFilter.value.toString().toLowerCase())
            }
        });
        return res;
    }
    filterChildren(children, parent) {
        let res = false;
        if (children) {
            children.map(child => {
                let _fields = this.filterFields(child.data);
                let _children = this.filterChildren(child.children, child);
                res = _fields || _children || res;
            });
            parent.expanded = res;
        }
        return res;
    }
    onRowTouchEnd() {
        this.rowTouched = true;
    }

    onRowRightClick(event: MouseEvent, node: TreeNode) {
        if (this.contextMenu) {
            let index = this.findIndexInSelection(node);
            let selected = (index >= 0);

            if (!selected) {
                if (this.isSingleSelectionMode()) {
                    this.selection = node;
                }
                else if (this.isMultipleSelectionMode()) {
                    this.selection = [node];
                    this.selectionChange.emit(this.selection);
                }

                this.selectionChange.emit(this.selection);
            }

            this.contextMenu.show(event);
            this.onContextMenuSelect.emit({ originalEvent: event, node: node });
        }
    }

    sortMultiple() {
        if (this.value) {
            this.value.sort((data1, data2) => {
                return this.multisortField(data1, data2, this.multiSortMeta, 0);
            });

            // if(this.hasFilter()) {
            //     this._filter();
            // }
        }
    }

    set first(val: number) {
        let shouldPaginate = this.initialized && this._first !== val;

        this._first = val;

        if (shouldPaginate) {
            this.paginate();
        }
    }

    paginate() {
        if (this.lazy)
            this.onLazyLoad.emit(this.createLazyLoadMetadata());
        else
            this.updateDataToRender(this.filteredValue || this.value);

        this.onPage.emit({
            first: this.first,
            rows: this.rows
        });
    }


    _filter() {
        this._first = 0;

        if (this.lazy) {
            this.onLazyLoad.emit(this.createLazyLoadMetadata());
        }
        else {
            if (!this.value || !this.columns) {
                return;
            }

            this.filteredValue = [];

            for (let i = 0; i < this.value.length; i++) {
                let localMatch = true;
                let globalMatch = false;

                for (let j = 0; j < this.columns.length; j++) {
                    let col = this.columns[j],
                        filterMeta = this.filters[col.filterField || col.field];

                    //local
                    if (filterMeta) {
                        let filterValue = filterMeta.value,
                            filterField = col.filterField || col.field,
                            filterMatchMode = filterMeta.matchMode || 'startsWith',
                            dataFieldValue = this.resolveFieldData(this.value[i], filterField);
                        let filterConstraint = this.filterConstraints[filterMatchMode];

                        if (!filterConstraint(dataFieldValue, filterValue)) {
                            localMatch = false;
                        }

                        if (!localMatch) {
                            break;
                        }
                    }
                }

                let matches = localMatch;
                if (this.globalFilter) {
                    matches = localMatch && globalMatch;
                }

                if (matches) {
                    this.filteredValue.push(this.value[i]);
                }
            }

            if (this.filteredValue.length === this.value.length) {
                this.filteredValue = null;
            }

            this.updateDataToRender(this.filteredValue || this.value);
        }

        this.onFilter.emit({
            filters: this.filters,
            filteredValue: this.filteredValue || this.value
        });
    }

    filterConstraints = {

        startsWith(value, filter): boolean {
            if (filter === undefined || filter === null || filter.trim() === '') {
                return true;
            }

            if (value === undefined || value === null) {
                return false;
            }

            let filterValue = filter.toLowerCase();
            return value.toString().toLowerCase().slice(0, filterValue.length) === filterValue;
        },

        contains(value, filter): boolean {
            if (filter === undefined || filter === null || (typeof filter === 'string' && filter.trim() === '')) {
                return true;
            }

            if (value === undefined || value === null) {
                return false;
            }

            return value.toString().toLowerCase().indexOf(filter.toLowerCase()) !== -1;
        },

        endsWith(value, filter): boolean {
            if (filter === undefined || filter === null || filter.trim() === '') {
                return true;
            }

            if (value === undefined || value === null) {
                return false;
            }

            let filterValue = filter.toString().toLowerCase();
            return value.toString().toLowerCase().indexOf(filterValue, value.toString().length - filterValue.length) !== -1;
        },

        equals(value, filter): boolean {
            if (filter === undefined || filter === null || (typeof filter === 'string' && filter.trim() === '')) {
                return true;
            }

            if (value === undefined || value === null) {
                return false;
            }

            return value.toString().toLowerCase() == filter.toString().toLowerCase();
        },

        notEquals(value, filter): boolean {
            if (filter === undefined || filter === null || (typeof filter === 'string' && filter.trim() === '')) {
                return false;
            }

            if (value === undefined || value === null) {
                return true;
            }

            return value.toString().toLowerCase() != filter.toString().toLowerCase();
        },

        in(value, filter: any[]): boolean {
            if (filter === undefined || filter === null || filter.length === 0) {
                return true;
            }

            if (value === undefined || value === null) {
                return false;
            }

            for (let i = 0; i < filter.length; i++) {
                if (filter[i] === value)
                    return true;
            }

            return false;
        }
    }


    hasFilter() {
        let empty = true;
        for (let prop in this.filters) {
            if (this.filters.hasOwnProperty(prop)) {
                empty = false;
                break;
            }
        }

        return !empty || (this.globalFilter && this.globalFilter.value && this.globalFilter.value.trim().length);
    }

    isFilterBlank(filter: any): boolean {
        if (filter !== null && filter !== undefined) {
            if ((typeof filter === 'string' && filter.trim().length == 0) || (filter instanceof Array && filter.length == 0))
                return true;
            else
                return false;
        }
        return true;
    }

    multisortField(data1, data2, multiSortMeta, index) {
        let value1 = this.resolveFieldData(data1, multiSortMeta[index].field);
        let value2 = this.resolveFieldData(data2, multiSortMeta[index].field);
        let result = null;

        if (typeof value1 == 'string' || value1 instanceof String) {
            if (value1.localeCompare && (value1 != value2)) {
                return (multiSortMeta[index].order * value1.localeCompare(value2));
            }
        }
        else {
            result = (value1 < value2) ? -1 : 1;
        }

        if (value1 == value2) {
            return (multiSortMeta.length - 1) > (index) ? (this.multisortField(data1, data2, multiSortMeta, index + 1)) : 0;
        }

        return (multiSortMeta[index].order * result);
    }

    createLazyLoadMetadata(): LazyLoadEvent {
        return {
            first: this.first,
            rows: this.virtualScroll ? this.rows * 2 : this.rows,
            sortField: this.sortField,
            sortOrder: this.sortOrder,
            filters: this.filters,
            globalFilter: this.globalFilter ? this.globalFilter.value : null,
            multiSortMeta: this.multiSortMeta
        };
    }

    resolveFieldData(data: any, field: string): any {
        if (data && field) {
            if (field.indexOf('.') == -1) {
                return data[field];
            }
            else {
                let fields: string[] = field.split('.');
                let value = data;
                for (var i = 0, len = fields.length; i < len; ++i) {
                    value = value[fields[i]];
                }
                return value;
            }
        }
        else {
            return null;
        }
    }
    findIndexInSelection(node: TreeNode) {
        let index: number = -1;

        if (this.selectionMode && this.selection) {
            if (this.isSingleSelectionMode()) {
                index = (this.selection == node) ? 0 : - 1;
            }
            else {
                for (let i = 0; i < this.selection.length; i++) {
                    if (this.selection[i] == node) {
                        index = i;
                        break;
                    }
                }
            }
        }

        return index;
    }

    propagateSelectionUp(node: TreeNode, select: boolean) {
        if (node.children && node.children.length) {
            let selectedCount: number = 0;
            let childPartialSelected: boolean = false;
            for (let child of node.children) {
                if (this.isSelected(child)) {
                    selectedCount++;
                }
                else if (child.partialSelected) {
                    childPartialSelected = true;
                }
            }

            if (select && selectedCount == node.children.length) {
                this.selection = [...this.selection || [], node];
                node.partialSelected = false;
            }
            else {
                if (!select) {
                    let index = this.findIndexInSelection(node);
                    if (index >= 0) {
                        this.selection = this.selection.filter((val, i) => i != index);
                    }
                }

                if (childPartialSelected || selectedCount > 0 && selectedCount != node.children.length)
                    node.partialSelected = true;
                else
                    node.partialSelected = false;
            }
        }

        let parent = node.parent;
        if (parent) {
            this.propagateSelectionUp(parent, select);
        }
    }

    propagateSelectionDown(node: TreeNode, select: boolean) {
        let index = this.findIndexInSelection(node);

        if (select && index == -1) {
            this.selection = [...this.selection || [], node];
        }
        else if (!select && index > -1) {
            this.selection = this.selection.filter((val, i) => i != index);
        }

        node.partialSelected = false;

        if (node.children && node.children.length) {
            for (let child of node.children) {
                this.propagateSelectionDown(child, select);
            }
        }
    }

    isSelected(node: TreeNode) {
        return this.findIndexInSelection(node) != -1;
    }

    isSingleSelectionMode() {
        return this.selectionMode && this.selectionMode == 'single';
    }

    isMultipleSelectionMode() {
        return this.selectionMode && this.selectionMode == 'multiple';
    }

    isCheckboxSelectionMode() {
        return this.selectionMode && this.selectionMode == 'checkbox';
    }

    //added from datatable
    sort(event, column: Column) {
        if (!column.sortable) {
            return;
        }
        let targetNode = event.target.nodeName;
        if ((targetNode == 'TH' && this.domHandler.hasClass(event.target, 'ui-sortable-column')) || ((targetNode == 'SPAN' || targetNode == 'DIV') && !this.domHandler.hasClass(event.target, 'ui-clickable'))) {
            if (!this.immutable) {
                this.preventSortPropagation = true;
            }

            let columnSortField = column.sortField || column.field;
            this._sortOrder = (this.sortField === columnSortField) ? this.sortOrder * -1 : this.defaultSortOrder;
            this._sortField = columnSortField;
            this.sortColumn = column;
            let metaKey = event.metaKey || event.ctrlKey;

            if (this.sortMode == 'multiple') {
                if (!this.multiSortMeta || !metaKey) {
                    this._multiSortMeta = [];
                }

                this.addSortMeta({ field: this.sortField, order: this.sortOrder });
            }
            if (this.sortMode == 'multiple')
                this.sortMultiple();
            else
                this.sortSingle();

            this.onSort.emit({
                field: this.sortField,
                order: this.sortOrder,
                multisortmeta: this.multiSortMeta
            });
        }

        this.updateDataToRender(this.filteredValue || this.value);
    }

    updateDataToRender(datasource) {
        this.dataToRender = datasource;
        if (this.rowGroupMode) {
            this.updateRowGroupMetadata();
        }
    }

    getSortOrder(column: Column) {
        let order = 0;
        let columnSortField = column.sortField || column.field;

        if (this.sortMode === 'single') {
            if (this.sortField && columnSortField === this.sortField) {
                order = this.sortOrder;
            }
        }
        else if (this.sortMode === 'multiple') {
            if (this.multiSortMeta) {
                for (let i = 0; i < this.multiSortMeta.length; i++) {
                    if (this.multiSortMeta[i].field == columnSortField) {
                        order = this.multiSortMeta[i].order;
                        break;
                    }
                }
            }
        }
        return order;
    }

    handleDataChange() {
        if (!this.lazy) {
            if (this.hasFilter()) {
                this._filter();
            }

            if (this.preventSortPropagation) {
                this.preventSortPropagation = false;
            }
            else if (this.sortField || this.multiSortMeta) {
                if (!this.sortColumn && this.columns) {
                    this.sortColumn = this.columns.find(col => col.field === this.sortField && col.sortable === 'custom');
                }

                if (this.sortMode == 'single')
                    this.sortSingle();
                else if (this.sortMode == 'multiple')
                    this.sortMultiple();
            }
        }

        this.updateDataToRender(this.filteredValue || this.value);
    }

    isSorted(column: Column) {
        if (!column.sortable) {
            return false;
        }

        let columnSortField = column.sortField || column.field;

        if (this.sortMode === 'single') {
            return (this.sortField && columnSortField === this.sortField);
        }
        else if (this.sortMode === 'multiple') {
            let sorted = false;
            if (this.multiSortMeta) {
                for (let i = 0; i < this.multiSortMeta.length; i++) {
                    if (this.multiSortMeta[i].field == columnSortField) {
                        sorted = true;
                        break;
                    }
                }
            }
            return sorted;
        }
    }

    onHeaderMousedown(event, header: any) {
        if (this.reorderableColumns) {
            if (event.target.nodeName !== 'INPUT') {
                header.draggable = true;
            } else if (event.target.nodeName === 'INPUT') {
                header.draggable = false;
            }
        }
    }

    updateRowGroupMetadata() {
        this.rowGroupMetadata = {};
        if (this.dataToRender) {
            for (let i = 0; i < this.dataToRender.length; i++) {
                let rowData = this.dataToRender[i];
                let group = this.resolveFieldData(rowData, this.sortField);
                if (i == 0) {
                    this.rowGroupMetadata[group] = { index: 0, size: 1 };
                }
                else {
                    let previousRowData = this.dataToRender[i - 1];
                    let previousRowGroup = this.resolveFieldData(previousRowData, this.sortField);
                    if (group === previousRowGroup) {
                        this.rowGroupMetadata[group].size++;
                    }
                    else {
                        this.rowGroupMetadata[group] = { index: i, size: 1 };
                    }
                }
            }
        }
    }

    addSortMeta(meta) {
        var index = -1;
        for (var i = 0; i < this.multiSortMeta.length; i++) {
            if (this.multiSortMeta[i].field === meta.field) {
                index = i;
                break;
            }
        }

        if (index >= 0)
            this.multiSortMeta[index] = meta;
        else
            this.multiSortMeta.push(meta);
    }


    iterateRowData(data){
       if(data !== undefined){
        data.sort((data1,data2)=>{
        let value1 = this.resolveFieldData(data1.data, this.sortField);
        let value2 = this.resolveFieldData(data2.data, this.sortField);
        let result = null;

        if (value1 == null && value2 != null)
            result = -1;
        else if (value1 != null && value2 == null)
            result = 1;
        else if (value1 == null && value2 == null)
            result = 0;
        else if (typeof value1 === 'string' && typeof value2 === 'string')
            result = value1.localeCompare(value2);
        else
            result = (value1 < value2) ? -1 : (value1 > value2) ? 1 : 0;

        return (this.sortOrder * result);
         });
       }      

        for(var i=0;i<data.length ; i++){
        for(var key in data[i]){
            if (key === "children"){
                this.iterateRowData(data[i][key]); 
            }
        }
      }
    }

    sortSingle() {
        if (this.value) {
            if (this.sortColumn && this.sortColumn.sortable === 'custom') {
                this.preventSortPropagation = true;
                this.sortColumn.sortFunction.emit({
                    field: this.sortField,
                    order: this.sortOrder
                });
            }
            else {
                this.iterateRowData(this.value);
            }

            this._first = 0;
        }
    }

    hasFooter() {
        if (this.columns) {
            let columnsArr = this.cols.toArray();
            for (let i = 0; i < columnsArr.length; i++) {
                if (columnsArr[i].footer) {
                    return true;
                }
            }
        }
        return false;
    }

}



@Component({
    selector: '[treetable-ext-headers]',
    template: `<ng-template ngFor let-col [ngForOf]="columns" let-lastCol="last">
      <th #headerCell [attr.id]="col.colId" [ngStyle]="col.headerStyle||col.style" [class]="col.headerStyleClass||col.styleClass" (click)="treeExt.sort($event,col)" [attr.colspan]="col.colspan" [attr.rowspan]="col.rowspan"
          [ngClass]="{'ui-state-default ui-unselectable-text':true, 'ui-sortable-column': col.sortable, 'ui-state-active': treeExt.isSorted(col), 'ui-resizable-column': treeExt.resizableColumns, 'ui-selection-column':col.selectionMode,
                      'ui-helper-hidden': col.hidden}"   [attr.tabindex]="col.sortable ? tabindex : null" (keydown)="treeExt.onHeaderKeydown($event,col)"
          [attr.scope]="col.scope||(col.colspan ? 'colgroup' : 'col')">
          <span class="ui-column-title" *ngIf="!col.selectionMode&&!col.headerTemplate">{{col.header}}</span>
          <span class="ui-column-title" *ngIf="col.headerTemplate">
          <p-columnHeaderTemplateLoader [column]="col"></p-columnHeaderTemplateLoader>
      </span>
          <span class="ui-sortable-column-icon fa fa-fw fa-sort" *ngIf="col.sortable"
               [ngClass]="{'fa-sort-desc': (treeExt.getSortOrder(col) == -1),'fa-sort-asc': (treeExt.getSortOrder(col) == 1)}"></span>
               <input [attr.type]="col.filterType" class="ui-column-filter ui-inputtext ui-widget ui-state-default ui-corner-all" [attr.maxlength]="col.filterMaxlength" [attr.placeholder]="col.filterPlaceholder" *ngIf="col.filter&&!col.filterTemplate" [value]="treeExt.filters[col.filterField||col.field] ? treeExt.filters[col.filterField||col.field].value : ''"
               (click)="treeExt.onFilterInputClick($event)" (input)="treeExt.onFilterKeyup($event.target.value, col.filterField||col.field, col.filterMatchMode)"/>
       </th>
  </ng-template>`,
    providers: [DomHandler, ObjectUtils]
})
export class TreeTableExtHeaderComponent {

    constructor(public el: ElementRef, public domHandler: DomHandler, public changeDetector: ChangeDetectorRef, public renderer: Renderer2, @Inject(forwardRef(() => TreeExTable)) public treeExt: TreeExTable) {
        //super(el , domHandler ,changeDetector ,renderer);
        //this.differ = differs.find([]).create(null);
    }

    @Input("treetable-ext-headers") columns: Column[];

}

@Component({
    selector: '[extTreeRow]',
    template: `
        <div [class]="node.styleClass" [ngClass]="{'ui-treetable-row': true, 'ui-state-highlight':isSelected(),'ui-treetable-row-selectable':treeTable.selectionMode && node.selectable !== false}">
            <td *ngFor="let col of treeTable.columns; let i=index" [ngStyle]="col.bodyStyle||col.style" [class]="col.bodyStyleClass||col.styleClass" (click)="onRowClick($event)" (dblclick)="rowDblClick($event)" (touchend)="onRowTouchEnd()" (contextmenu)="onRowRightClick($event)">
                <a href="#" *ngIf="i == treeTable.toggleColumnIndex" class="ui-treetable-toggler fa fa-fw ui-clickable" [ngClass]="node.expanded ? treeTable.expandedIcon : treeTable.collapsedIcon"
                    [ngStyle]="{'margin-left':level*16 + 'px','visibility': isLeaf() ? 'hidden' : 'visible'}"
                    (click)="toggle($event)"
                    [title]="node.expanded ? labelCollapse : labelExpand">
                </a>
                <div class="ui-chkbox ui-treetable-checkbox" *ngIf="treeTable.selectionMode == 'checkbox' && i==0"><div class="ui-chkbox-box ui-widget ui-corner-all ui-state-default">
                    <span class="ui-chkbox-icon ui-clickable fa" 
                        [ngClass]="{'fa-check':isSelected(),'fa-minus':node.partialSelected}"></span></div></div
                ><span *ngIf="!col.template">{{resolveFieldData(node.data,col.field)}}</span>
                <p-columnBodyTemplateLoader [column]="col" [rowData]="node" *ngIf="col.template"></p-columnBodyTemplateLoader>
            </td>
        </div>
        <div *ngIf="node.children && node.expanded" class="ui-treetable-row" style="display:table-row">
            <td [attr.colspan]="treeTable.columns.length" class="ui-treetable-child-table-container">
                <table [class]="treeTable.tableStyleClass" [ngStyle]="treeTable.tableStyle">
                    <tbody extTreeRow *ngFor="let childNode of node.children" [node]="childNode" [level]="level+1" [labelExpand]="labelExpand" [labelCollapse]="labelCollapse" [parentNode]="node"></tbody>
                </table>
            </td>
        </div>
    `
})
export class UIExtTreeRow implements OnInit {

    @Input() node: TreeNode;

    @Input() parentNode: TreeNode;

    @Input() level: number = 0;

    @Input() labelExpand: string = "Expand";

    @Input() labelCollapse: string = "Collapse";

    constructor( @Inject(forwardRef(() => TreeExTable)) public treeTable: TreeExTable) { }

    ngOnInit() {
        this.node.parent = this.parentNode;
    }

    toggle(event: Event) {
        if (this.node.expanded)
            this.treeTable.onNodeCollapse.emit({ originalEvent: event, node: this.node });
        else
            this.treeTable.onNodeExpand.emit({ originalEvent: event, node: this.node });

        this.node.expanded = !this.node.expanded;

        event.preventDefault();
    }

    isLeaf() {
        return this.node.leaf == false ? false : !(this.node.children && this.node.children.length);
    }

    isSelected() {
        return this.treeTable.isSelected(this.node);
    }

    onRowClick(event: MouseEvent) {
        this.treeTable.onRowClick(event, this.node);
    }

    onRowRightClick(event: MouseEvent) {
        this.treeTable.onRowRightClick(event, this.node);
    }

    rowDblClick(event: MouseEvent) {
        this.treeTable.onRowDblclick.emit({ originalEvent: event, node: this.node });
    }

    onRowTouchEnd() {
        this.treeTable.onRowTouchEnd();
    }

    resolveFieldData(data: any, field: string): any {
        if (data && field) {
            if (field.indexOf('.') == -1) {
                return data[field];
            }
            else {
                let fields: string[] = field.split('.');
                let value = data;
                for (var i = 0, len = fields.length; i < len; ++i) {
                    value = value[fields[i]];
                }
                return value;
            }
        }
        else {
            return null;
        }
    }
}
