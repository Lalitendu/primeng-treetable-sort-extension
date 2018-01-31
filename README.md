# primeng-treetable-sort-extension
NGPrime Treetable sort extension demo

Example

[selector -->  ext-treeTable]

<ext-treeTable [value]="files1">   <p-header>Basic</p-header>
	
        <p-column field="name" [sortable]="true" header="Name"></p-column>              
        
        <p-column field="size" [sortable]="true" header="Size"></p-column>
        
        
        <p-column field="type" [sortable]="true" header="Type"></p-column> </ext-treeTable>


This will display the treetable with sort option.
Please import the source files used in the component from primeNG master code base.
