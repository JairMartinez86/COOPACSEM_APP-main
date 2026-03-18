import { Component } from '@angular/core';
import { TableFilterService } from '../../../../core/services/table-filter.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cliente-list',
  imports: [],
  templateUrl: './cliente-list.html',
  styleUrl: './cliente-list.scss',
})
export class ClienteList {


  rowsAll: any[] = [];
  rows: any[] = [];
  private sub?: Subscription;

  constructor(private filterSvc: TableFilterService) { }

  ngOnInit() {



    // Carga inicial
    this.rowsAll = [
      { name: 'Ana', email: 'ana@mail.com', role: 'Admin' },
      { name: 'Luis', email: 'luis@mail.com', role: 'User' },
    ];
    this.rows = [...this.rowsAll];

    this.sub = this.filterSvc.query$("clientes").subscribe(q => {
      const term = (q || '').trim().toLowerCase();

      this.rows = !term
        ? [...this.rowsAll]
        : this.rowsAll.filter(r =>
          (`${r.name} ${r.email} ${r.role}`).toLowerCase().includes(term)
        );
    });


  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }


}
