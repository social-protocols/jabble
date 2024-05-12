# inspired by https://ayats.org/blog/nix-rustup/

{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/ba733f8000925e837e30765f273fec153426403d";

    # for `flake-utils.lib.eachSystem`
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ ];
          config.allowUnfree = false;
        };
      in
      {
        devShells = {
          default = with pkgs; pkgs.mkShellNoCC {
            buildInputs = [
              git
              just

              sqlite-interactive
              nodejs_21

              earthly
              flyctl

              # darwin.apple_sdk.frameworks.Security
            ];
          };
        };
        packages = {
          ci = pkgs.buildEnv {
            name = "ci-build-env";
            paths = with pkgs; [
                nodejs_21
            ];
          };
        };
      }
    );
}


