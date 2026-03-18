import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClienteList } from './cliente-list';

describe('ClienteList', () => {
  let component: ClienteList;
  let fixture: ComponentFixture<ClienteList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClienteList],
    }).compileComponents();

    fixture = TestBed.createComponent(ClienteList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
