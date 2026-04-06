plugins {
    id("java")
    id("org.jetbrains.intellij.platform") version "2.13.1"
    id("org.jetbrains.kotlin.jvm") version "2.0.21"
}

group = "com.qoocode"
version = providers.gradleProperty("pluginVersion").get()

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
intellijPlatform {
    intellijIdea("2023.1.2")
    bundledPlugin("com.intellij.java")
    bundledPlugin("org.jetbrains.kotlin")
}

    implementation("org.jetbrains.kotlin:kotlin-stdlib:2.0.21")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.9.0")
}

tasks {
    withType<JavaCompile> {
        sourceCompatibility = "17"
        targetCompatibility = "17"
    }

    withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        }
    }

    // 复制 qoocode.exe 到插件资源目录（在构建插件之前执行）
    register<Copy>("copyQooCodeExe") {
        // qoocode.exe 应该在项目根目录（jetbrains-plugin的父目录）
        val parentDir = projectDir.parentFile
        val qoocodeExe = File(parentDir, "qoocode.exe")
        val targetDir = File(projectDir, "src/main/resources/bin")

        if (qoocodeExe.exists()) {
            from(qoocodeExe)
            into(targetDir)
            doLast {
                println("Successfully copied qoocode.exe from ${qoocodeExe.absolutePath} to ${targetDir.absolutePath}")
            }
        } else {
            println("Warning: qoocode.exe not found at ${qoocodeExe.absolutePath}")
            println("Current projectDir: ${projectDir.absolutePath}")
            println("Expected qoocode.exe location: ${qoocodeExe.absolutePath}")
        }
    }

    // 在构建插件之前复制 qoocode.exe
    named<Copy>("copyQooCodeExe") {
        // Copy task is defined above
    }

    // 设置 buildPlugin 任务依赖 copyQooCodeExe
    named("buildPlugin") {
        dependsOn("copyQooCodeExe")
    }

    // 也要确保 processResources 任务在复制后执行
    named("processResources") {
        dependsOn("copyQooCodeExe")
    }
}
