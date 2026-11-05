{
  lib,
  stdenvNoCC,
  callPackage,
  bun,
  nodejs,
  sysctl,
  makeBinaryWrapper,
  models-dev,
  ripgrep,
  wayland,
  installShellFiles,
  versionCheckHook,
  writableTmpDirAsHomeHook,
  node_modules ? callPackage ./node_modules.nix { },
}:
stdenvNoCC.mkDerivation (finalAttrs: {
  pname = "elhadry";
  inherit (node_modules) version src;
  inherit node_modules;

  nativeBuildInputs = [
    bun
    nodejs # for patchShebangs node_modules
    installShellFiles
    makeBinaryWrapper
    models-dev
    writableTmpDirAsHomeHook
  ];

  postPatch = ''
    # NOTE: Relax Bun version check to be a warning instead of an error
    substituteInPlace packages/script/src/index.ts \
      --replace-fail 'throw new Error(`This script requires bun@''${expectedBunVersionRange}' \
                     'console.warn(`Warning: This script requires bun@''${expectedBunVersionRange}'
  '';

  configurePhase = ''
    runHook preConfigure

    cp -R ${finalAttrs.node_modules}/. .
    patchShebangs node_modules
    patchShebangs packages/*/node_modules

    runHook postConfigure
  '';

  env.MODELS_DEV_API_JSON = "${models-dev}/dist/_api.json";
  env.OPENCODE_DISABLE_MODELS_FETCH = true;
  env.OPENCODE_VERSION = finalAttrs.version;
  env.OPENCODE_CHANNEL = "prod";
  env.NODE_OPTIONS = "--max-old-space-size=4096";

  buildPhase = ''
    runHook preBuild

    cd ./packages/cli
    bun --bun ./script/build.ts --single --skip-install

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    install -Dm755 dist/cli-*/bin/elhadry $out/bin/elhadry

    # OpenTUI dlopens Wayland for clipboard images.
    wrapProgram $out/bin/elhadry \
      --prefix PATH : ${
        lib.makeBinPath (
          [
            ripgrep
          ]
          # bun runs sysctl to detect if running on rosetta2
          ++ lib.optional stdenvNoCC.hostPlatform.isDarwin sysctl
        )
      } ${lib.optionalString stdenvNoCC.hostPlatform.isLinux ''
        --prefix LD_LIBRARY_PATH : ${lib.makeLibraryPath [ wayland ]}
      ''}

    ln -s elhadry $out/bin/elhadry2
    # Legacy launcher names stay as compatibility shims.
    ln -s elhadry $out/bin/opencode
    ln -s elhadry $out/bin/opencode2

    runHook postInstall
  '';

  postInstall = lib.optionalString (stdenvNoCC.buildPlatform.canExecute stdenvNoCC.hostPlatform) ''
    # v2 dropped the `completion` subcommand; --completions is the global flag.
    # --completions also accepts sh, which emits the same script as bash.
    # staged to files, substitute below rejects anything that is not a regular file
    $out/bin/elhadry --completions bash > elhadry.bash
    $out/bin/elhadry --completions zsh > _elhadry
    $out/bin/elhadry --completions fish > elhadry.fish

    installShellCompletion --cmd elhadry \
      --bash elhadry.bash \
      --fish elhadry.fish \
      --zsh _elhadry

    # OPENCODE_CLI_NAME is a build-time define, so the elhadry2 copies are
    # renamed rather than regenerated. --replace-fail is a global literal
    # substitution, so any lowercase elhadry that later appears in a
    # description or help text ships as elhadry2 in the elhadry2 copy.
    substitute elhadry.bash elhadry2.bash --replace-fail elhadry elhadry2
    substitute _elhadry _elhadry2 --replace-fail elhadry elhadry2
    substitute elhadry.fish elhadry2.fish --replace-fail elhadry elhadry2

    installShellCompletion --cmd elhadry2 \
      --bash elhadry2.bash \
      --fish elhadry2.fish \
      --zsh _elhadry2
  '';

  nativeInstallCheckInputs = [
    versionCheckHook
    writableTmpDirAsHomeHook
  ];
  doInstallCheck = true;
  versionCheckKeepEnvironment = [ "HOME" "OPENCODE_DISABLE_MODELS_FETCH" ];
  versionCheckProgramArg = "--version";

  passthru = {
    env = finalAttrs.env;
  };

  meta = {
    description = "The open source AI coding agent";
    homepage = "https://elhadry.ai";
    license = lib.licenses.mit;
    mainProgram = "elhadry";
    inherit (node_modules.meta) platforms;
  };
})
