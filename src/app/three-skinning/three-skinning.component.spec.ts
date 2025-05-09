import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThreeSkinningComponent } from './three-skinning.component';

describe('ThreeSkinningComponent', () => {
  let component: ThreeSkinningComponent;
  let fixture: ComponentFixture<ThreeSkinningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThreeSkinningComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThreeSkinningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
