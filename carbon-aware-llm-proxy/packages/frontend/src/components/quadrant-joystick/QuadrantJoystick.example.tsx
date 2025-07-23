"use client";

import React, { useState } from "react";
import { QuadrantJoystick } from "./QuadrantJoystick";
import { Position } from "./QuadrantJoystick.types";

export function QuadrantJoystickExample() {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [quadrant, setQuadrant] = useState<string>("center");

  const handlePositionChange = (newPosition: {
    x: number;
    y: number;
    quadrant?: string;
  }) => {
    setPosition({ x: newPosition.x, y: newPosition.y });
    setQuadrant(newPosition.quadrant || "center");
  };

  return (
    <div className="p-8 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Quadrant Joystick Demo</h2>
        <p className="text-muted-foreground">
          Drag the knob to select your preference between Efficiency, Trust,
          Performance, and Simplicity
        </p>
      </div>

      <div className="flex justify-center">
        <QuadrantJoystick
          onChange={handlePositionChange}
          defaultPosition={{ x: 0, y: 0 }}
          showCoordinates={true}
          size={320}
        />
      </div>

      <div className="text-center space-y-2">
        <div className="text-sm">
          <span className="font-medium">Current Position:</span>{" "}
          <span className="text-muted-foreground">
            ({position.x.toFixed(2)}, {position.y.toFixed(2)})
          </span>
        </div>
        <div className="text-sm">
          <span className="font-medium">Selected Quadrant:</span>{" "}
          <span className="text-primary font-semibold">{quadrant}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        <div className="space-y-2">
          <h3 className="font-semibold">Usage Examples</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Basic Usage</h4>
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                {`<QuadrantJoystick onChange={handleChange} />`}
              </pre>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">
                With Default Position
              </h4>
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                {`<QuadrantJoystick 
  defaultPosition={{ x: 0.5, y: -0.3 }} 
  onChange={handleChange} 
/>`}
              </pre>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Disabled State</h4>
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                {`<QuadrantJoystick disabled />`}
              </pre>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Integration Guide</h3>
          <div className="text-sm space-y-2">
            <p>
              <strong>Import:</strong> Import the component from the
              quadrant-joystick directory
            </p>
            <p>
              <strong>Props:</strong> Customize with size, defaultPosition,
              onChange, and more
            </p>
            <p>
              <strong>Styling:</strong> Uses Tailwind CSS and matches the
              existing design system
            </p>
            <p>
              <strong>Responsive:</strong> Works on both desktop and mobile
              devices
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
