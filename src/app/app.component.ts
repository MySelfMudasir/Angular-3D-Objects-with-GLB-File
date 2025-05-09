import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThreeViewerComponent } from "./three-viewer/three-viewer.component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ThreeViewerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'angular-3d-viewer';
}
