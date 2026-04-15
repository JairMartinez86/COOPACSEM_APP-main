import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-cliente-form',
  templateUrl: './cliente-form.html'
})
export class ClienteForm {

  id: string | null = null;

  nombre = '';
  email = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id');

    if (this.id) {
      // 🔁 aquí cargarías desde API
      this.nombre = 'Cliente ' + this.id;
      this.email = 'cliente' + this.id + '@mail.com';


    }

    
  }

  guardar() {

    this.router.navigate(['/clientes']);
  }
}